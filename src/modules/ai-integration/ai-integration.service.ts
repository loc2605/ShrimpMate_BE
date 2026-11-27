import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { AiRecommendation } from '../../database/entities/ai-recommendation.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import {
  AiRecommendationStatus,
  CropSeasonStatus,
  FeedingStatus,
  SafetyDecision,
} from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { PredictFeedOverrideDto } from './dto/predict-feed.dto';

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

    // Delta_TAN được tính từ hai số đo TAN gần nhất, không dùng số đo NH3.
    const recentReadings = await this.readingRepository.find({
      where: { pondId },
      order: { measuredAt: 'DESC' },
      take: 10,
    });
    const recentTanReadings = await this.readingRepository.find({
      where: { pondId, tanMgL: Not(IsNull()) },
      order: { measuredAt: 'DESC' },
      take: 2,
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
    if (recentTanReadings.length >= 2) {
      const tanLatest = Number(recentTanReadings[0].tanMgL);
      const tanPrevious = Number(recentTanReadings[1].tanMgL);
      if (Number.isFinite(tanLatest) && Number.isFinite(tanPrevious)) {
        deltaTan = Number((tanLatest - tanPrevious).toFixed(3));
      }
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
}
