import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiRecommendation } from '../../database/entities/ai-recommendation.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import {
  AiRecommendationStatus,
  AppetiteLevel,
  CropSeasonStatus,
  FeedingStatus,
  SafetyDecision,
} from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { PredictFeedOverrideDto } from './dto/predict-feed.dto';

interface AiMicroserviceFeedResponse {
  predictedFeedAmountKg: number;
  biomassKg: number;
  feedRatePercent: number;
  modelName: string;
  modelVersion: string;
  confidence: number;
  featureImportance: Record<string, number>;
  explanation: string;
}

@Injectable()
export class AiIntegrationService {
  private readonly logger = new Logger(AiIntegrationService.name);

  constructor(
    @InjectRepository(AiRecommendation)
    private readonly recommendationRepository: Repository<AiRecommendation>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(CropSeason)
    private readonly cropSeasonRepository: Repository<CropSeason>,
    @InjectRepository(TelemetryReading)
    private readonly readingRepository: Repository<TelemetryReading>,
    @InjectRepository(FeedingRecord)
    private readonly recordRepository: Repository<FeedingRecord>,
    private readonly pondAccessService: PondAccessService,
    private readonly safetyRuleEngineService: SafetyRuleEngineService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Dự báo nhu cầu thức ăn thông minh sử dụng mô hình AI Machine Learning (XGBoost)
   * Tự động tổng hợp 7 đặc trưng từ CSDL sinh học & cảm biến môi trường (không dùng camera/FIS)
   */
  async predictFeedDemand(pondId: string, user: User, dto?: PredictFeedOverrideDto) {
    const pond = await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    // 1. Lấy vụ nuôi đang hoạt động (Active Crop Season)
    const activeSeason = await this.cropSeasonRepository.findOne({
      where: { pondId, status: CropSeasonStatus.ACTIVE },
    });

    // 2. Tính toán ngày tuổi (DOC), trọng lượng mẫu (ABW) và số lượng tôm
    let doc = 35;
    let avgWeightG = 8.5;
    let shrimpCount = 100000;

    if (activeSeason) {
      const stockingTime = new Date(activeSeason.stockingDate).getTime();
      const diffDays = Math.floor((Date.now() - stockingTime) / (1000 * 60 * 60 * 24));
      doc = Math.max(1, diffDays);

      const initialWeight = Number(activeSeason.initialAverageWeightG) || 0.8;
      // Tăng trưởng bình quân 0.28g/ngày theo mô hình thực nghiệm nuôi tôm
      avgWeightG = Number((initialWeight + doc * 0.28).toFixed(2));

      const survivalRate = (Number(activeSeason.estimatedSurvivalRate) || 85) / 100;
      shrimpCount = Math.floor(activeSeason.initialCount * survivalRate);
    }

    // Áp dụng giá trị ghi đè thủ công (nếu người dùng truyền vào trong DTO)
    if (dto?.doc !== undefined) doc = dto.doc;
    if (dto?.avgWeightG !== undefined) avgWeightG = dto.avgWeightG;

    // 3. Lấy dữ liệu quan trắc môi trường (DO_min và Delta_TAN)
    const recentReadings = await this.readingRepository.find({
      where: { pondId },
      order: { measuredAt: 'DESC' },
      take: 10,
    });

    let doMin = 5.2;
    if (recentReadings.length > 0) {
      const doList = recentReadings
        .map((r) => Number(r.dissolvedOxygenMgL))
        .filter((val) => !isNaN(val) && val > 0);
      if (doList.length > 0) doMin = Math.min(...doList);
    }
    if (dto?.doMin !== undefined) doMin = dto.doMin;

    let deltaTan = 0.05;
    if (recentReadings.length >= 2) {
      const tanLatest = Number(recentReadings[0].ammoniaMgL) || 0;
      const tanPrev = Number(recentReadings[1].ammoniaMgL) || 0;
      deltaTan = Number((tanLatest - tanPrev).toFixed(3));
    }
    if (dto?.deltaTan !== undefined) deltaTan = dto.deltaTan;

    // 4. Lấy lượng thức ăn tiêu thụ cữ liền trước
    const lastRecord = await this.recordRepository.findOne({
      where: { pondId, status: FeedingStatus.COMPLETED },
      order: { startedAt: 'DESC' },
    });
    let prevFeedKg = lastRecord?.actualAmountKg ? Number(lastRecord.actualAmountKg) : 6.5;
    if (dto?.prevFeedAmountKg !== undefined) prevFeedKg = dto.prevFeedAmountKg;

    // Lấy dữ liệu thời tiết thực tế từ telemetry (nếu có từ cảm biến/IoT)
    let morningRainMm = 0.0;
    if (dto?.morningRainMm !== undefined) {
      morningRainMm = dto.morningRainMm;
    } else if (recentReadings.length > 0 && recentReadings[0].rawData) {
      const rawRain = recentReadings[0].rawData['rainMm'] ?? recentReadings[0].rawData['morningRainMm'];
      if (rawRain !== undefined && !isNaN(Number(rawRain))) {
        morningRainMm = Number(rawRain);
      }
    }

    let waterChangeM3 = 0.0;
    if (dto?.waterChangeM3 !== undefined) {
      waterChangeM3 = dto.waterChangeM3;
    } else if (recentReadings.length > 0 && recentReadings[0].rawData) {
      const rawWater = recentReadings[0].rawData['waterChangeM3'];
      if (rawWater !== undefined && !isNaN(Number(rawWater))) {
        waterChangeM3 = Number(rawWater);
      }
    }

    const pondAreaM2 = Number(pond.areaM2) || 1000.0;

    // 5. Đóng gói vector đặc trưng môi trường & sinh học gửi sang AI Microservice (FastAPI)
    const featurePayload = {
      doc,
      avgWeightG,
      doMin,
      deltaTan,
      morningRainMm,
      prevFeedAmountKg: prevFeedKg,
      waterChangeM3,
      pondAreaM2,
      shrimpCount,
    };

    const aiEngineBaseUrl = this.configService.get<string>('ai.engineUrl', 'http://localhost:8000');
    let aiResponse: AiMicroserviceFeedResponse;

    try {
      // Thiết lập timeout 6 giây qua AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${aiEngineBaseUrl}/ai/predict-feed-demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featurePayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      aiResponse = (await response.json()) as AiMicroserviceFeedResponse;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[AiIntegration] Không thể kết nối AI Microservice (${aiEngineBaseUrl}): ${errorMsg}. Tự động kích hoạt cơ chế Chịu lỗi Dự phòng (Heuristic Aquaculture Fallback).`,
      );
      aiResponse = this.calculateHeuristicFeedDemand(
        doc,
        avgWeightG,
        shrimpCount,
        doMin,
        recentReadings[0]?.temperatureC ?? 28.5,
        morningRainMm,
        pondAreaM2,
      );
    }

    // 6. Kiểm duyệt bắt buộc qua Lớp Quy tắc An toàn (Safety Rule Engine)
    const safetyResult = await this.safetyRuleEngineService.evaluateFeedingSafety(
      pondId,
      undefined,
      aiResponse.predictedFeedAmountKg,
    );

    // 7. Lưu lịch sử khuyến nghị AI vào bảng ai_recommendations
    const recommendation = this.recommendationRepository.create({
      pondId,
      modelName: aiResponse.modelName,
      modelVersion: aiResponse.modelVersion,
      predictedFeedAmountKg: safetyResult.allowedAmountKg,
      spreadRateKgPerMinute: 1.5,
      appetiteLevel: AppetiteLevel.NORMAL,
      biomassKg: aiResponse.biomassKg,
      confidence: aiResponse.confidence,
      inputSnapshot: featurePayload,
      explanation: aiResponse.explanation,
      safetyDecision: safetyResult.decision,
      safetyReason: safetyResult.reasons.length > 0 ? safetyResult.reasons.join('; ') : 'Môi trường an toàn',
      status: AiRecommendationStatus.PENDING,
    });

    const saved = await this.recommendationRepository.save(recommendation);

    return {
      recommendationId: saved.id,
      pondId,
      predictedFeedAmountKg: aiResponse.predictedFeedAmountKg,
      safeAllowedAmountKg: safetyResult.allowedAmountKg,
      biomassKg: aiResponse.biomassKg,
      feedRatePercent: aiResponse.feedRatePercent,
      safetyDecision: safetyResult.decision,
      safetyReasons: safetyResult.reasons,
      featureBreakdown: featurePayload,
      featureImportance: aiResponse.featureImportance,
      explanation: aiResponse.explanation,
      createdAt: saved.createdAt,
    };
  }

  async getLatestRecommendation(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const recommendation = await this.recommendationRepository.findOne({
      where: { pondId },
      order: { createdAt: 'DESC' },
    });

    if (!recommendation) {
      return { message: 'Chưa có dữ liệu khuyến nghị AI cho ao này' };
    }

    return {
      recommendation,
    };
  }

  async getRecommendations(pondId: string, user: User, limit = 10) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    return this.recommendationRepository.find({
      where: { pondId },
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
    });
  }

  async getPredictedTrends(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const evaluation = await this.safetyRuleEngineService.evaluateFeedingSafety(
      pondId,
      undefined,
      10.0,
    );

    const isAdjusted = evaluation.contextSnapshot?.isAdaptiveAdjusted ?? false;
    const isBlocked = evaluation.decision === SafetyDecision.BLOCKED;

    return {
      pondId,
      currentDo: evaluation.telemetrySnapshot?.dissolvedOxygenMgL,
      predictedDo1h: evaluation.contextSnapshot?.predictedDo1h,
      predictedDo2h: evaluation.contextSnapshot?.predictedDo2h,
      riskLevel: isBlocked ? 'CRITICAL' : isAdjusted ? 'WARNING' : 'NORMAL',
      adaptiveAction: isBlocked
        ? 'BLOCK_FEEDING'
        : isAdjusted
          ? 'REDUCE_FEED_40%'
          : 'MAINTAIN_NORMAL_FEED',
      decision: evaluation.decision,
      reasons: evaluation.reasons,
      recommendation: isBlocked
        ? 'Chất lượng nước hiện tại vi phạm ngưỡng an toàn. Cần bật quạt nước khẩn cấp và hoãn cữ ăn.'
        : isAdjusted
          ? 'Dự báo sau cữ ăn DO tụt dưới 3.2 mg/L do vi khuẩn phân hủy thức ăn. Hệ thống tự động giảm 40% thức ăn và kích hoạt quạt nước sớm 15 phút.'
          : 'Chỉ số môi trường và dự báo 2 giờ tới hoàn toàn an toàn, cho tôm ăn đúng định mức.',
    };
  }

  async getBiomassForecast(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const activeSeason = await this.cropSeasonRepository.findOne({
      where: { pondId, status: CropSeasonStatus.ACTIVE },
    });

    if (!activeSeason) {
      return {
        message: 'Ao chưa có vụ nuôi đang hoạt động để dự báo sinh khối',
        biomassKg: 0,
      };
    }

    const diffDays = Math.max(
      1,
      Math.floor((Date.now() - new Date(activeSeason.stockingDate).getTime()) / (1000 * 60 * 60 * 24)),
    );
    const initialWeight = Number(activeSeason.initialAverageWeightG) || 0.8;
    const currentWeightG = Number((initialWeight + diffDays * 0.28).toFixed(2));
    const survivalRate = (Number(activeSeason.estimatedSurvivalRate) || 85) / 100;
    const currentCount = Math.floor(activeSeason.initialCount * survivalRate);
    const biomassKg = Number(((currentCount * currentWeightG) / 1000).toFixed(2));

    return {
      pondId,
      cropSeasonId: activeSeason.id,
      daysOfCulture: diffDays,
      estimatedShrimpCount: currentCount,
      estimatedAverageWeightG: currentWeightG,
      estimatedSurvivalRatePercent: Number(activeSeason.estimatedSurvivalRate) || 85,
      estimatedBiomassKg: biomassKg,
      dailyFeedDemandKg: Number((biomassKg * (6.5 / Math.pow(currentWeightG, 0.28)) / 100).toFixed(2)),
    };
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }

  /**
   * Bộ quy tắc dự phòng Heuristic dựa trên khoa học thủy sản (tiêu chuẩn nuôi tôm thẻ chân trắng)
   * Tự động kích hoạt khi AI Microservice ngoại vi gặp sự cố hoặc timeout quá 6 giây
   */
  private calculateHeuristicFeedDemand(
    doc: number,
    avgWeightG: number,
    shrimpCount: number,
    doMin: number,
    temperatureC: number,
    morningRainMm: number,
    _pondAreaM2: number,
  ): AiMicroserviceFeedResponse {
    const biomassKg = Number(((shrimpCount * avgWeightG) / 1000).toFixed(2));

    // 1. Tỷ lệ ăn cơ bản theo trọng lượng mẫu (ABW)
    let dailyRatePercent = 3.5;
    if (avgWeightG < 3) dailyRatePercent = 5.5;
    else if (avgWeightG < 8) dailyRatePercent = 4.2;
    else if (avgWeightG < 15) dailyRatePercent = 3.2;
    else dailyRatePercent = 2.5;

    // Khẩu phần cho 1 cữ ăn (chia đều 4 cữ ăn/ngày)
    const mealFeedKg = (biomassKg * (dailyRatePercent / 100)) / 4;

    // 2. Hệ số hiệu chỉnh môi trường Heuristic
    let factor = 1.0;
    const constraints: string[] = [];

    if (temperatureC < 26) {
      factor *= 0.8;
      constraints.push(`Nhiệt độ nước thấp (${temperatureC}°C), giảm 20%`);
    } else if (temperatureC > 32) {
      factor *= 0.85;
      constraints.push(`Nhiệt độ nước cao (${temperatureC}°C), giảm 15%`);
    }

    if (doMin < 4.5 && doMin >= 3.5) {
      factor *= 0.75;
      constraints.push(`Oxy cận ngưỡng an toàn (${doMin} mg/L), giảm 25%`);
    }

    if (morningRainMm > 10) {
      factor *= 0.7;
      constraints.push(`Trời mưa (${morningRainMm}mm), giảm 30%`);
    }

    const predictedFeedAmountKg = Number(Math.max(1.0, mealFeedKg * factor).toFixed(2));

    return {
      predictedFeedAmountKg,
      biomassKg,
      feedRatePercent: Number((dailyRatePercent * factor).toFixed(2)),
      modelName: 'Heuristic-Aquaculture-Fallback',
      modelVersion: 'v1.0.0-heuristic',
      confidence: 0.78,
      featureImportance: {
        biomass: 0.45,
        temperature: 0.2,
        dissolved_oxygen: 0.2,
        rain: 0.15,
      },
      explanation: `Mô hình thủy sản Heuristic dự phòng (AI Microservice timeout/offline): Dựa trên sinh khối ${biomassKg}kg (DOC ${doc}), tỷ lệ cơ bản ${dailyRatePercent}%. Hiệu chỉnh: ${constraints.length > 0 ? constraints.join(', ') : 'môi trường tối ưu'}. Khuyến nghị: ${predictedFeedAmountKg}kg.`,
    };
  }
}
