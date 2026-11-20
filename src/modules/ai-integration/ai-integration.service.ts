import {
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
import { FeedingFeedback } from '../../database/entities/feeding-feedback.entity';
import {
  AiRecommendationStatus,
  CropSeasonStatus,
  FeedbackEvaluation,
  FeedingStatus,
  SafetyDecision,
} from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { PredictFeedOverrideDto } from './dto/predict-feed.dto';
import { RecordFeedingFeedbackDto } from './dto/record-feedback.dto';

export interface FeatureContribution {
  feature: string;
  name: string;
  value: number | string;
  impact: 'INCREASE' | 'DECREASE' | 'NEUTRAL';
  deltaKg: number;
  description: string;
}

interface AiMicroserviceFeedResponse {
  predictedFeedAmountKg: number;
  baseValueKg?: number;
  modelName: string;
  modelVersion: string;
  featureImportance: Record<string, number>;
  explanation: string;
  featureContributions?: FeatureContribution[];
}

interface AiMicroserviceHealthResponse {
  status: string;
  service?: string;
  version?: string;
  modelName?: string;
  modelsLoaded?: {
    xgboost?: boolean;
  };
}

export interface AiServiceHealthStatus {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  mode: 'AI_XGBOOST' | 'HEURISTIC_FALLBACK';
  engineUrl: string;
  latencyMs: number;
  serviceStatus: string;
  modelName: string;
  modelVersion: string;
  modelsLoaded: {
    xgboost: boolean;
  };
  message: string;
  error?: string;
  checkedAt: string;
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
    @InjectRepository(FeedingFeedback)
    private readonly feedbackRepository: Repository<FeedingFeedback>,
    private readonly pondAccessService: PondAccessService,
    private readonly safetyRuleEngineService: SafetyRuleEngineService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Dự báo nhu cầu thức ăn thông minh sử dụng mô hình AI Machine Learning (XGBoost)
   * Tự động tổng hợp 7 đặc trưng từ CSDL sinh học & cảm biến môi trường
   */
  async predictFeedDemand(pondId: string, user: User, dto?: PredictFeedOverrideDto) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    // 1. Lấy vụ nuôi đang hoạt động (Active Crop Season)
    const activeSeason = await this.cropSeasonRepository.findOne({
      where: { pondId, status: CropSeasonStatus.ACTIVE },
    });

    // 2. Tính toán ngày tuổi (DOC) và trọng lượng bình quân mẫu (ABW)
    let doc = 35;
    let avgWeightG = 8.5;

    if (activeSeason) {
      const stockingTime = new Date(activeSeason.stockingDate).getTime();
      const diffDays = Math.floor((Date.now() - stockingTime) / (1000 * 60 * 60 * 24));
      doc = Math.max(1, diffDays);

      const initialWeight = Number(activeSeason.initialAverageWeightG) || 0.8;
      // Tăng trưởng bình quân 0.28g/ngày theo mô hình thực nghiệm nuôi tôm
      avgWeightG = Number((initialWeight + doc * 0.28).toFixed(2));
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

    // 5. Đóng gói đúng 7 đặc trưng chuẩn gửi sang AI Microservice (FastAPI XGBoost)
    const featurePayload = {
      doc,
      avgWeightG,
      doMin,
      deltaTan,
      morningRainMm,
      prevFeedAmountKg: prevFeedKg,
      waterChangeM3,
    };

    const aiEngineBaseUrl = this.configService.get<string>('ai.engineUrl') || 'http://localhost:8000';
    const shortPondId = pondId.slice(0, 8);
    let aiResponse: AiMicroserviceFeedResponse;
    const requestStartedAt = performance.now();

    try {
      // Thiết lập timeout 6 giây qua AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${aiEngineBaseUrl}/ai/predict-feed-demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pondId,
          ...featurePayload,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      aiResponse = (await response.json()) as AiMicroserviceFeedResponse;
      const elapsedMs = (performance.now() - requestStartedAt).toFixed(1);
      this.logger.log(
        `[AI-ENGINE] [Pond: ${shortPondId}] -> DOC: ${doc} | ABW: ${avgWeightG.toFixed(2)}g | DO_min: ${doMin.toFixed(2)}mg/L | Predict: ${aiResponse.predictedFeedAmountKg.toFixed(2)}kg | Latency: ${elapsedMs}ms`,
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[AI-ENGINE] [Pond: ${shortPondId}] Không thể kết nối AI Microservice (${aiEngineBaseUrl}): ${errorMsg}. Tự động kích hoạt chế độ Dự phòng (Heuristic Aquaculture Fallback).`,
      );
      aiResponse = this.calculateHeuristicFeedDemand(featurePayload);
    }

    // 6. Kiểm duyệt bắt buộc qua Lớp Quy tắc An toàn (Safety Rule Engine)
    const safetyResult = await this.safetyRuleEngineService.evaluateFeedingSafety(
      pondId,
      undefined,
      aiResponse.predictedFeedAmountKg,
    );

    // 7. Lưu lịch sử khuyến nghị AI vào bảng ai_recommendations
    // Chỉ lưu các trường được mô hình AI thực sự tính toán (không gán cứng spreadRate/appetiteLevel/confidence/biomass giả lập)
    const recommendation = this.recommendationRepository.create({
      pondId,
      modelName: aiResponse.modelName,
      modelVersion: aiResponse.modelVersion,
      predictedFeedAmountKg: safetyResult.allowedAmountKg,
      spreadRateKgPerMinute: null,
      appetiteLevel: null,
      biomassKg: null,
      confidence: null,
      inputSnapshot: {
        ...featurePayload,
        baseValueKg: aiResponse.baseValueKg ?? null,
        featureContributions: aiResponse.featureContributions ?? [],
      },
      explanation: aiResponse.explanation,
      safetyDecision: safetyResult.decision,
      safetyReason: safetyResult.reasons.length > 0 ? safetyResult.reasons.join('; ') : 'Môi trường an toàn',
      status: AiRecommendationStatus.PENDING,
    });

    const saved = await this.recommendationRepository.save(recommendation);

    return {
      recommendationId: saved.id,
      pondId,
      modelName: aiResponse.modelName,
      modelVersion: aiResponse.modelVersion,
      predictedFeedAmountKg: aiResponse.predictedFeedAmountKg,
      safeAllowedAmountKg: safetyResult.allowedAmountKg,
      baseValueKg: aiResponse.baseValueKg ?? null,
      safetyDecision: safetyResult.decision,
      safetyReasons: safetyResult.reasons,
      featureBreakdown: featurePayload,
      featureImportance: aiResponse.featureImportance,
      featureContributions: aiResponse.featureContributions ?? [],
      explanation: aiResponse.explanation,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Kiểm tra trạng thái kết nối tới AI Microservice (FastAPI GET /health)
   * Dùng cho Dashboard Admin/Manager hiển thị trạng thái AI Engine (ONLINE / OFFLINE)
   */
  async checkAiServiceHealth(): Promise<AiServiceHealthStatus> {
    const aiEngineBaseUrl = this.configService.get<string>('ai.engineUrl') || 'http://localhost:8000';
    const startedAt = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${aiEngineBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Number((performance.now() - startedAt).toFixed(1));

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as AiMicroserviceHealthResponse;
      const isXgboostReady = Boolean(data.modelsLoaded?.xgboost);
      const version = data.version ?? '2.0.0';
      const versionLabel = version.startsWith('v') ? version : `v${version}`;
      const modelName = data.modelName ?? 'XGBoost-Regressor';

      if (isXgboostReady) {
        return {
          status: 'ONLINE',
          mode: 'AI_XGBOOST',
          engineUrl: aiEngineBaseUrl,
          latencyMs,
          serviceStatus: data.status ?? 'healthy',
          modelName,
          modelVersion: versionLabel,
          modelsLoaded: { xgboost: true },
          message: `AI Engine: Hoạt động (XGBoost ${versionLabel} Ready)`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: 'DEGRADED',
        mode: 'HEURISTIC_FALLBACK',
        engineUrl: aiEngineBaseUrl,
        latencyMs,
        serviceStatus: data.status ?? 'degraded',
        modelName,
        modelVersion: versionLabel,
        modelsLoaded: { xgboost: false },
        message: 'AI Engine: Kết nối được nhưng mô hình XGBoost chưa sẵn sàng (Đang dự phòng Heuristic)',
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const latencyMs = Number((performance.now() - startedAt).toFixed(1));
      const errorMsg = err instanceof Error ? err.message : String(err);

      return {
        status: 'OFFLINE',
        mode: 'HEURISTIC_FALLBACK',
        engineUrl: aiEngineBaseUrl,
        latencyMs,
        serviceStatus: 'unreachable',
        modelName: 'Heuristic-Aquaculture-Fallback',
        modelVersion: 'v1.0.0-heuristic',
        modelsLoaded: { xgboost: false },
        error: errorMsg,
        message: 'AI Engine: Ngoại tuyến (Đang chạy chế độ Dự phòng Heuristic)',
        checkedAt: new Date().toISOString(),
      };
    }
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
   * Bộ quy tắc dự phòng Heuristic bám đúng 7 đặc trưng tiêu chuẩn
   * Tự động kích hoạt khi AI Microservice ngoại vi gặp sự cố hoặc timeout quá 6 giây
   */
  private calculateHeuristicFeedDemand(features: {
    doc: number;
    avgWeightG: number;
    doMin: number;
    deltaTan: number;
    morningRainMm: number;
    prevFeedAmountKg: number;
    waterChangeM3: number;
  }): AiMicroserviceFeedResponse {
    const {
      doc,
      avgWeightG,
      doMin,
      deltaTan,
      morningRainMm,
      prevFeedAmountKg,
      waterChangeM3,
    } = features;

    const baseFeedKg = Math.max(0, prevFeedAmountKg);
    let currentFeedKg = baseFeedKg;
    const constraints: string[] = [];
    const featureContributions: FeatureContribution[] = [
      {
        feature: 'prev_feed_kg',
        name: 'Lượng ăn cữ liền trước',
        value: `${prevFeedAmountKg.toFixed(2)} kg`,
        impact: baseFeedKg > 0 ? 'INCREASE' : 'NEUTRAL',
        deltaKg: Number(baseFeedKg.toFixed(2)),
        description: `Dùng lượng ăn cữ liền trước (${prevFeedAmountKg.toFixed(2)} kg) làm mốc cơ sở khi chạy chế độ dự phòng Heuristic (DOC ${doc}, ABW ${avgWeightG.toFixed(2)}g).`,
      },
    ];

    // 1. Oxy hòa tan (DO min)
    if (doMin < 3.5) {
      const delta = -Number(currentFeedKg.toFixed(2));
      currentFeedKg = 0;
      constraints.push(`DO nguy cấp (${doMin.toFixed(2)} mg/L < 3.5), ngắt cữ ăn`);
      featureContributions.push({
        feature: 'do_min',
        name: 'Oxy hòa tan tối thiểu (DO min)',
        value: `${doMin.toFixed(2)} mg/L`,
        impact: 'DECREASE',
        deltaKg: delta,
        description: `Oxy hòa tan dưới ngưỡng sinh tồn (<3.5 mg/L), ngắt toàn bộ cữ ăn (${delta} kg).`,
      });
    } else if (doMin < 4.0) {
      const nextFeed = currentFeedKg * 0.5;
      const delta = Number((nextFeed - currentFeedKg).toFixed(2));
      currentFeedKg = nextFeed;
      constraints.push(`DO thấp (${doMin.toFixed(2)} mg/L), giảm 50%`);
      featureContributions.push({
        feature: 'do_min',
        name: 'Oxy hòa tan tối thiểu (DO min)',
        value: `${doMin.toFixed(2)} mg/L`,
        impact: 'DECREASE',
        deltaKg: delta,
        description: `Oxy hòa tan thấp (3.5 - 4.0 mg/L), cắt giảm 50% (${delta} kg).`,
      });
    } else {
      featureContributions.push({
        feature: 'do_min',
        name: 'Oxy hòa tan tối thiểu (DO min)',
        value: `${doMin.toFixed(2)} mg/L`,
        impact: 'NEUTRAL',
        deltaKg: 0,
        description: `Nồng độ oxy ${doMin.toFixed(2)} mg/L đạt mức an toàn.`,
      });
    }

    // 2. Mưa sáng sớm
    if (morningRainMm >= 10 && currentFeedKg > 0) {
      const nextFeed = currentFeedKg * 0.7;
      const delta = Number((nextFeed - currentFeedKg).toFixed(2));
      currentFeedKg = nextFeed;
      constraints.push(`Mưa lớn (${morningRainMm.toFixed(1)} mm), giảm 30%`);
      featureContributions.push({
        feature: 'morning_rain_mm',
        name: 'Lượng mưa sáng sớm',
        value: `${morningRainMm.toFixed(1)} mm`,
        impact: 'DECREASE',
        deltaKg: delta,
        description: `Mưa lớn (>= 10 mm) làm giảm sức ăn, cắt giảm 30% (${delta} kg).`,
      });
    } else {
      featureContributions.push({
        feature: 'morning_rain_mm',
        name: 'Lượng mưa sáng sớm',
        value: `${morningRainMm.toFixed(1)} mm`,
        impact: 'NEUTRAL',
        deltaKg: 0,
        description: `Lượng mưa ${morningRainMm.toFixed(1)} mm không ảnh hưởng đáng kể đến cữ ăn.`,
      });
    }

    // 3. Biến thiên đạm Amoniac (Delta TAN)
    if (deltaTan > 0.5 && currentFeedKg > 0) {
      const nextFeed = currentFeedKg * 0.75;
      const delta = Number((nextFeed - currentFeedKg).toFixed(2));
      currentFeedKg = nextFeed;
      constraints.push(`ΔTAN cao (+${deltaTan.toFixed(2)} mg/L), giảm 25%`);
      featureContributions.push({
        feature: 'delta_tan',
        name: 'Biến thiên đạm Amoniac (ΔTAN)',
        value: `${deltaTan >= 0 ? '+' : ''}${deltaTan.toFixed(3)} mg/L`,
        impact: 'DECREASE',
        deltaKg: delta,
        description: `Biến thiên TAN vượt 0.5 mg/L, cắt giảm 25% (${delta} kg) để hạn chế tích tụ khí độc.`,
      });
    } else {
      featureContributions.push({
        feature: 'delta_tan',
        name: 'Biến thiên đạm Amoniac (ΔTAN)',
        value: `${deltaTan >= 0 ? '+' : ''}${deltaTan.toFixed(3)} mg/L`,
        impact: 'NEUTRAL',
        deltaKg: 0,
        description: `Biến thiên TAN nằm trong ngưỡng ổn định.`,
      });
    }

    // 4. Thay nước
    if (waterChangeM3 > 0 && currentFeedKg > 0) {
      const nextFeed = currentFeedKg * 1.05;
      const delta = Number((nextFeed - currentFeedKg).toFixed(2));
      currentFeedKg = nextFeed;
      constraints.push(`Thay nước (${waterChangeM3.toFixed(0)} m³), tăng nhẹ 5%`);
      featureContributions.push({
        feature: 'water_change_m3',
        name: 'Lượng nước thay trong ngày',
        value: `${waterChangeM3.toFixed(0)} m³`,
        impact: 'INCREASE',
        deltaKg: delta,
        description: `Thay ${waterChangeM3.toFixed(0)} m³ nước kích thích tôm ăn khỏe (+${delta} kg).`,
      });
    } else {
      featureContributions.push({
        feature: 'water_change_m3',
        name: 'Lượng nước thay trong ngày',
        value: `${waterChangeM3.toFixed(0)} m³`,
        impact: 'NEUTRAL',
        deltaKg: 0,
        description: `Không có thay nước trong ngày.`,
      });
    }

    const predictedFeedAmountKg = Number(Math.max(0, currentFeedKg).toFixed(2));

    return {
      predictedFeedAmountKg,
      baseValueKg: Number(baseFeedKg.toFixed(2)),
      modelName: 'Heuristic-Aquaculture-Fallback',
      modelVersion: 'v1.0.0-heuristic',
      featureImportance: {},
      explanation: `[Dự phòng Heuristic] Dựa trên lượng ăn cữ trước ${baseFeedKg.toFixed(2)} kg (DOC ${doc}, ABW ${avgWeightG.toFixed(2)} g/con). Điều chỉnh theo môi trường: ${constraints.length > 0 ? constraints.join('; ') : 'môi trường ổn định'}. Khối lượng đề xuất: ${predictedFeedAmountKg.toFixed(2)} kg/cữ.`,
      featureContributions,
    };
  }

  /**
   * Đóng vòng lặp học tăng cường từ sàn ăn (Post-Feeding Feedback Loop):
   * Ghi nhận kết quả kiểm tra nhá (sàn ăn) sau cữ ăn, tính toán lượng cám thực sự tiêu thụ,
   * đánh giá độ chính xác của AI và đồng bộ sang AI Microservice để phục vụ Continual Learning.
   */
  async recordFeedingFeedback(
    pondId: string,
    recordId: string,
    dto: RecordFeedingFeedbackDto,
    user: User,
  ) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const record = await this.recordRepository.findOne({
      where: { id: recordId, pondId },
      relations: { aiRecommendation: true },
    });

    if (!record) {
      throw new NotFoundException(`Không tìm thấy cữ cho ăn với id ${recordId} thuộc ao nuôi này`);
    }

    const actualAmountKg = Number(record.actualAmountKg ?? record.requestedAmountKg ?? 0);
    const leftoverPercent = dto.leftoverPercent;
    const inspectionMinutes = dto.trayInspectionMinutes ?? 90;

    // 1. Tính toán lượng thức ăn thực tế tôm đã tiêu thụ (Effective Consumed Feed)
    const effectiveConsumedKg = Number(
      Math.max(0, actualAmountKg * (1 - leftoverPercent / 100)).toFixed(2),
    );

    // 2. Đánh giá chất lượng cữ ăn (Feedback Evaluation)
    let evaluation: FeedbackEvaluation = FeedbackEvaluation.OPTIMAL;
    let adjustmentPercent = 0.0;
    let feedbackExplanation = '';

    if (leftoverPercent > 10.0) {
      evaluation = FeedbackEvaluation.OVER_FEEDING;
      // Dư cám: đề xuất cữ sau giảm tỉ lệ tương đương để tránh thối đáy ao
      adjustmentPercent = -Number(leftoverPercent.toFixed(1));
      feedbackExplanation = `Cám thừa trên sàn ăn ${leftoverPercent}% (> 10%). Tôm ăn không hết, cảnh báo dư thừa thức ăn. Đề xuất cữ ăn tiếp theo giảm ${Math.abs(adjustmentPercent)}% lượng cám.`;
    } else if (leftoverPercent === 0.0 && inspectionMinutes < 60) {
      evaluation = FeedbackEvaluation.UNDER_FEEDING;
      // Nhá hết sạch trong thời gian ngắn (< 60 phút): tôm ăn rất khỏe/thiếu cám
      adjustmentPercent = 5.0;
      feedbackExplanation = `Sàn ăn hết sạch cám sau ${inspectionMinutes} phút (< 60 phút). Đàn tôm bắt mồi rất mạnh, có thể tăng nhẹ 5% định mức ở cữ kế tiếp.`;
    } else {
      evaluation = FeedbackEvaluation.OPTIMAL;
      adjustmentPercent = 0.0;
      feedbackExplanation = `Lượng cám thừa trên sàn ăn ${leftoverPercent}% (đạt mức lý tưởng 0 - 10%). Khẩu phần cữ ăn của AI hoàn toàn chuẩn xác.`;
    }

    // 3. Tính toán sai số dự báo (Residual) so với khuyến nghị AI ban đầu
    const predictedAmountKg = record.aiRecommendation?.predictedFeedAmountKg
      ? Number(record.aiRecommendation.predictedFeedAmountKg)
      : (Number(record.requestedAmountKg) || actualAmountKg);
    const residualKg = Number((predictedAmountKg - effectiveConsumedKg).toFixed(2));

    // 4. Lấy vector 7 đặc trưng lúc cho ăn (từ inputSnapshot của khuyến nghị AI hoặc tính từ telemetry)
    const featuresSnapshot: Record<string, number> = {};
    if (record.aiRecommendation?.inputSnapshot) {
      const snap = record.aiRecommendation.inputSnapshot as Record<string, unknown>;
      featuresSnapshot['doc'] = Number(snap['doc']) || 35;
      featuresSnapshot['avg_weight_g'] = Number(snap['avgWeightG']) || 8.5;
      featuresSnapshot['do_min'] = Number(snap['doMin']) || 5.2;
      featuresSnapshot['delta_tan'] = Number(snap['deltaTan']) || 0.05;
      featuresSnapshot['morning_rain_mm'] = Number(snap['morningRainMm']) || 0.0;
      featuresSnapshot['prev_feed_kg'] = Number(snap['prevFeedAmountKg']) || 6.5;
      featuresSnapshot['water_change_m3'] = Number(snap['waterChangeM3']) || 0.0;
    }

    // 5. Lưu bản ghi FeedingFeedback vào CSDL
    const feedback = this.feedbackRepository.create({
      pondId,
      recordId: record.id,
      recommendationId: record.aiRecommendationId ?? null,
      actualAmountKg,
      leftoverPercent,
      trayInspectionMinutes: inspectionMinutes,
      gutFullnessScore: dto.gutFullnessScore ?? null,
      effectiveConsumedKg,
      predictedAmountKg,
      residualKg,
      evaluation,
      recommendedAdjustmentPercent: adjustmentPercent,
      notes: dto.notes?.trim() || null,
      featuresSnapshot,
      syncedToAi: false,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    // Cập nhật lại leftoverPercent vào cữ ăn chính
    record.leftoverPercent = leftoverPercent;
    await this.recordRepository.save(record);

    // 6. Bắn đồng bộ sang AI Microservice (Post-Feeding Feedback Loop)
    this.syncFeedbackToAiEngine(savedFeedback, featuresSnapshot).catch((err) => {
      this.logger.warn(`[FeedbackLoop] Không thể đồng bộ feedback sang AI Microservice: ${err.message}`);
    });

    return {
      feedbackId: savedFeedback.id,
      recordId: record.id,
      pondId,
      actualAmountKg,
      leftoverPercent,
      effectiveConsumedKg,
      predictedAmountKg,
      residualKg,
      evaluation,
      recommendedAdjustmentPercent: adjustmentPercent,
      explanation: feedbackExplanation,
      notes: savedFeedback.notes,
      createdAt: savedFeedback.createdAt,
    };
  }

  /**
   * Lấy lịch sử phản hồi sàn ăn của ao nuôi kèm thống kê sai số AI
   */
  async getFeedbackHistory(pondId: string, user: User, limit = 20, page = 1) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const safeLimit = Math.min(100, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await this.feedbackRepository.findAndCount({
      where: { pondId },
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip,
      relations: { record: true, recommendation: true },
    });

    return {
      data: items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Thống kê hiệu năng mô hình từ dữ liệu kiểm tra sàn ăn thực tế
   */
  async getModelPerformanceMetrics(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const feedbacks = await this.feedbackRepository.find({
      where: { pondId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const totalSamples = feedbacks.length;
    let optimalCount = 0;
    let overFeedingCount = 0;
    let underFeedingCount = 0;
    let totalAbsResidual = 0;

    for (const fb of feedbacks) {
      if (fb.evaluation === FeedbackEvaluation.OPTIMAL) optimalCount++;
      else if (fb.evaluation === FeedbackEvaluation.OVER_FEEDING) overFeedingCount++;
      else if (fb.evaluation === FeedbackEvaluation.UNDER_FEEDING) underFeedingCount++;

      if (fb.residualKg !== null) {
        totalAbsResidual += Math.abs(Number(fb.residualKg));
      }
    }

    const localMae = totalSamples > 0 ? Number((totalAbsResidual / totalSamples).toFixed(2)) : 0;
    const optimalPercent = totalSamples > 0 ? Number(((optimalCount / totalSamples) * 100).toFixed(1)) : 0;
    const overPercent = totalSamples > 0 ? Number(((overFeedingCount / totalSamples) * 100).toFixed(1)) : 0;
    const underPercent = totalSamples > 0 ? Number(((underFeedingCount / totalSamples) * 100).toFixed(1)) : 0;

    // Lấy thêm metrics từ AI Microservice nếu có kết nối
    let aiMicroserviceMetrics: any = null;
    const aiEngineBaseUrl = this.configService.get<string>('ai.engineUrl') || 'http://localhost:8000';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${aiEngineBaseUrl}/ai/feedback/metrics`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        aiMicroserviceMetrics = await res.json();
      }
    } catch {
      // Bỏ qua nếu AI service offline
    }

    return {
      pondId,
      totalFeedbackSamples: totalSamples,
      summary: {
        optimalCount,
        optimalPercent,
        overFeedingCount,
        overFeedingPercent: overPercent,
        underFeedingCount,
        underFeedingPercent: underPercent,
        realWorldMaeKg: localMae,
      },
      evaluationRating:
        optimalPercent >= 80 ? 'XUẤT SẮC (Mô hình khớp chuẩn đàn tôm)' :
        optimalPercent >= 60 ? 'TỐT (Cần tiếp tục tích lũy dữ liệu sàn ăn)' :
        totalSamples < 5 ? 'ĐANG TÍCH LŨY DỮ LIỆU' : 'CẦN HUẤN LUYỆN LẠI (Drift detected)',
      aiMicroserviceMetrics,
      recentFeedbacks: feedbacks.slice(0, 5).map((f) => ({
        id: f.id,
        recordId: f.recordId,
        actualAmountKg: Number(f.actualAmountKg),
        leftoverPercent: Number(f.leftoverPercent),
        effectiveConsumedKg: Number(f.effectiveConsumedKg),
        residualKg: f.residualKg !== null ? Number(f.residualKg) : null,
        evaluation: f.evaluation,
        createdAt: f.createdAt,
      })),
    };
  }

  /**
   * Kích hoạt học tăng cường (Online Retrain/Fine-tuning) mô hình XGBoost từ dữ liệu sàn ăn thực tế
   */
  async triggerModelRetrain(user: User) {
    const aiEngineBaseUrl = this.configService.get<string>('ai.engineUrl') || 'http://localhost:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${aiEngineBaseUrl}/ai/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const retrainResult = await response.json();
      this.logger.log(
        `[FeedbackLoop] ✅ Đã kích hoạt học tăng cường mô hình AI thành công bởi user ${user.id}: ${JSON.stringify(retrainResult)}`,
      );

      return {
        success: true,
        triggeredBy: user.id,
        timestamp: new Date().toISOString(),
        ...retrainResult,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[FeedbackLoop] Lỗi khi kích hoạt retrain AI model: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        message: 'Không thể kích hoạt fine-tuning mô hình AI (Máy chủ AI có thể đang bận hoặc ngoại tuyến).',
      };
    }
  }

  /**
   * Đồng bộ phản hồi sàn ăn sang FastAPI Microservice
   */
  private async syncFeedbackToAiEngine(feedback: FeedingFeedback, features: Record<string, number>) {
    const aiEngineBaseUrl = this.configService.get<string>('ai.engineUrl') || 'http://localhost:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${aiEngineBaseUrl}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: feedback.recordId,
          pondId: feedback.pondId,
          features: {
            doc: features['doc'] ?? 35,
            avg_weight_g: features['avg_weight_g'] ?? 8.5,
            do_min: features['do_min'] ?? 5.2,
            delta_tan: features['delta_tan'] ?? 0.05,
            morning_rain_mm: features['morning_rain_mm'] ?? 0.0,
            prev_feed_kg: features['prev_feed_kg'] ?? 6.5,
            water_change_m3: features['water_change_m3'] ?? 0.0,
          },
          predictedKg: Number(feedback.predictedAmountKg ?? feedback.actualAmountKg),
          actualFedKg: Number(feedback.actualAmountKg),
          leftoverPercent: Number(feedback.leftoverPercent),
          effectiveConsumedKg: Number(feedback.effectiveConsumedKg),
          evaluation: feedback.evaluation.toUpperCase(),
          trayInspectionMinutes: feedback.trayInspectionMinutes ?? 90,
          timestamp: feedback.createdAt.toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        feedback.syncedToAi = true;
        await this.feedbackRepository.save(feedback);
        this.logger.log(`[FeedbackLoop] ✅ Đã đồng bộ mẫu phản hồi ${feedback.id} sang AI Microservice.`);
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[FeedbackLoop] Không thể đồng bộ feedback sang AI Engine: ${errorMsg}`);
    }
  }
}
