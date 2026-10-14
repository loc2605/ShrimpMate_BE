import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppetiteLevel } from '../../database/entities/enums';

export interface VisionModelWeights {
  weightRt: number; // w1
  weightVt: number; // w2
  weightDt: number; // w3
  weightCt: number; // w4
  quantile25: number; // q25
  quantile50: number; // q50
  quantile75: number; // q75
}

export interface YoloSegResult {
  remainingFeedAreaRt: number;
  shrimpDensityDt: number;
  feedAreaPixels?: number;
  totalTrayAreaPixels?: number;
  shrimpCount?: number;
  shrimpMaskConfidence?: number;
  detectedObjects?: Array<{ label: string; confidence: number; bbox: number[] }>;
}

export interface MobileNetResult {
  behaviorClassificationCt: number;
  classProbabilities?: {
    none: number;
    weak: number;
    normal: number;
    strong: number;
  };
  confidence: number;
}

export interface RawVisionMetrics {
  remainingFeedAreaRt: number; // Rt
  shrimpDensityDt: number; // Dt
  behaviorClassificationCt: number; // Ct
  previousRt?: number | null;
  timeDeltaSeconds?: number;
}

export interface ProcessedFisResult {
  raw: {
    remainingFeedAreaRt: number;
    feedConsumptionVelocityVt: number;
    shrimpDensityDt: number;
    behaviorClassificationCt: number;
  };
  normalized: {
    normalizedRt: number;
    normalizedVt: number;
    normalizedDt: number;
    normalizedCt: number;
  };
  fisScore: number;
  appetiteLevel: AppetiteLevel;
  confidence: number;
  weights: VisionModelWeights;
  isAnomaly: boolean;
  anomalyReason?: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class CameraAiEngineService {
  private readonly logger = new Logger(CameraAiEngineService.name);

  // Cấu hình trọng số và phân vị mặc định (có thể tinh chỉnh theo từng ao/vụ nuôi)
  private readonly defaultWeights: VisionModelWeights = {
    weightRt: 0.35, // w1: Diện tích thức ăn còn lại
    weightVt: 0.25, // w2: Tốc độ tiêu thụ
    weightDt: 0.20, // w3: Mật độ tôm tại sàng
    weightCt: 0.20, // w4: Phân loại hành vi ăn tức thời
    quantile25: 0.25, // q25: Ngưỡng 0 (Không ăn) -> 1 (Ăn yếu)
    quantile50: 0.50, // q50: Ngưỡng 1 (Ăn yếu) -> 2 (Ăn bình thường)
    quantile75: 0.75, // q75: Ngưỡng 2 (Ăn bình thường) -> 3 (Ăn mạnh)
  };

  // Giới hạn Min-Max cho chuẩn hóa
  private readonly minMaxBounds = {
    rt: { min: 0.0, max: 1.0 }, // Rt: 0 (hết sạch) -> 1 (đầy sàng)
    vt: { min: 0.0, max: 0.05 }, // vt: 0 -> 0.05 diện tích/giây
    dt: { min: 0.0, max: 30.0 }, // Dt: 0 -> 30 con/m2 hoặc chỉ số
    ct: { min: 0.0, max: 3.0 }, // Ct: 0 -> 3 (nhãn MobileNetV3)
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Chạy song song 2 luồng AI (YOLO11n-seg & MobileNetV3-Small) trên cùng 1 khung hình thật
   * Kết nối trực tiếp tới AI Engine service, không dùng dữ liệu giả lập
   */
  async processFrameParallel(
    frameData?: string,
    frameUrl?: string,
    roi?: Record<string, unknown>,
    previousRt?: number | null,
    timeDeltaSeconds = 20,
    weightsOverride?: Partial<VisionModelWeights>,
  ): Promise<ProcessedFisResult> {
    if (!frameData && !frameUrl) {
      throw new BadRequestException(
        'Vui lòng cung cấp dữ liệu hình ảnh (frameData base64 hoặc frameUrl) thực tế để phân tích.',
      );
    }

    const startTime = Date.now();

    // 1. Chạy song song 2 luồng phân tích bằng Promise.all
    const [yoloResult, mobileNetResult] = await Promise.all([
      this.runYoloSegInference(frameData, frameUrl, roi),
      this.runMobileNetInference(frameData, frameUrl, roi),
    ]);

    const inferenceDurationMs = Date.now() - startTime;
    this.logger.debug(`Hoàn tất suy luận AI song song (Dual-stream) thực tế trong ${inferenceDurationMs}ms`);

    // 2. Tổng hợp chỉ số FIS từ kết quả 2 mô hình
    return this.calculateFis({
      remainingFeedAreaRt: yoloResult.remainingFeedAreaRt,
      shrimpDensityDt: yoloResult.shrimpDensityDt,
      behaviorClassificationCt: mobileNetResult.behaviorClassificationCt,
      previousRt,
      timeDeltaSeconds,
    }, weightsOverride, {
      inferenceDurationMs,
      yoloDetails: yoloResult,
      mobileNetDetails: mobileNetResult,
      roi,
      models: {
        segmentation: 'YOLO11n-seg v1.0',
        classification: 'MobileNetV3-Small v1.0',
      },
    });
  }

  /**
   * Tính toán và chuẩn hóa FIS từ các đại lượng đo trực tiếp (Rt, Dt, Ct, vt)
   */
  calculateFis(
    metrics: RawVisionMetrics,
    weightsOverride?: Partial<VisionModelWeights>,
    extraMetadata: Record<string, unknown> = {},
  ): ProcessedFisResult {
    const weights: VisionModelWeights = {
      ...this.defaultWeights,
      ...weightsOverride,
    };

    const deltaT = Math.max(1, metrics.timeDeltaSeconds ?? 20);
    const prevRt = metrics.previousRt ?? metrics.remainingFeedAreaRt;

    // Tính tốc độ tiêu thụ vt = max(0, (Rt_prev - Rt_current)) / deltaT
    const deltaRt = Math.max(0, prevRt - metrics.remainingFeedAreaRt);
    const vt = deltaRt / deltaT;

    const rt = Math.max(0, Math.min(1, metrics.remainingFeedAreaRt));
    const dt = Math.max(0, metrics.shrimpDensityDt);
    const ct = Math.max(0, Math.min(3, metrics.behaviorClassificationCt));

    // Chuẩn hóa Min-Max:
    // Với Rt (thức ăn còn lại): Còn càng ít thức ăn -> điểm ăn càng cao => normalizedRt = 1 - norm(Rt)
    const normRtRaw = this.minMaxNormalize(rt, this.minMaxBounds.rt.min, this.minMaxBounds.rt.max);
    const normalizedRt = Number((1.0 - normRtRaw).toFixed(4));

    // Với vt (tốc độ tiêu thụ): Ăn càng nhanh -> điểm càng cao
    const normalizedVt = Number(
      this.minMaxNormalize(vt, this.minMaxBounds.vt.min, this.minMaxBounds.vt.max).toFixed(4),
    );

    // Với Dt (mật độ tôm): Càng đông tôm bâu vào sàng -> điểm càng cao
    const normalizedDt = Number(
      this.minMaxNormalize(dt, this.minMaxBounds.dt.min, this.minMaxBounds.dt.max).toFixed(4),
    );

    // Với Ct (phân loại hành vi MobileNetV3 0..3)
    const normalizedCt = Number(
      this.minMaxNormalize(ct, this.minMaxBounds.ct.min, this.minMaxBounds.ct.max).toFixed(4),
    );

    // Tổng hợp FIS = w1 * norm(Rt) + w2 * norm(vt) + w3 * norm(Dt) + w4 * norm(Ct)
    const sumWeights = weights.weightRt + weights.weightVt + weights.weightDt + weights.weightCt;
    const w1 = weights.weightRt / sumWeights;
    const w2 = weights.weightVt / sumWeights;
    const w3 = weights.weightDt / sumWeights;
    const w4 = weights.weightCt / sumWeights;

    const fisScoreRaw = w1 * normalizedRt + w2 * normalizedVt + w3 * normalizedDt + w4 * normalizedCt;
    const fisScore = Number(Math.max(0, Math.min(1, fisScoreRaw)).toFixed(4));

    // Phân loại 4 mức theo ngưỡng phân vị (q25, q50, q75)
    let appetiteLevel: AppetiteLevel;
    if (fisScore < weights.quantile25) {
      appetiteLevel = AppetiteLevel.NONE; // Mức 0: Không ăn (0.00 - q25)
    } else if (fisScore < weights.quantile50) {
      appetiteLevel = AppetiteLevel.WEAK; // Mức 1: Ăn yếu (q25 - q50)
    } else if (fisScore < weights.quantile75) {
      appetiteLevel = AppetiteLevel.NORMAL; // Mức 2: Ăn bình thường (q50 - q75)
    } else {
      appetiteLevel = AppetiteLevel.STRONG; // Mức 3: Ăn mạnh (q75 - 1.00)
    }

    // Đánh giá bất thường nghiêm trọng (Anomaly Detection)
    // Ví dụ: Thức ăn còn thừa > 70% (Rt >= 0.70) và mật độ tôm gần như 0 hoặc FIS tụt dốc
    let isAnomaly = false;
    let anomalyReason: string | undefined;

    if (rt >= 0.70 && dt <= 1.0 && fisScore < weights.quantile25) {
      isAnomaly = true;
      anomalyReason = 'Thức ăn dư thừa nghiêm trọng tại sàng ăn, không ghi nhận tôm vào ăn';
    } else if (prevRt < 0.3 && rt > 0.8) {
      isAnomaly = true;
      anomalyReason = 'Biến động bất thường diện tích thức ăn trên sàng quan sát';
    }

    const confidence = typeof extraMetadata.confidence === 'number'
      ? extraMetadata.confidence
      : Number((((extraMetadata.yoloDetails as YoloSegResult | undefined)?.shrimpMaskConfidence ?? 0.9) *
          ((extraMetadata.mobileNetDetails as MobileNetResult | undefined)?.confidence ?? 0.9)).toFixed(4));

    return {
      raw: {
        remainingFeedAreaRt: rt,
        feedConsumptionVelocityVt: Number(vt.toFixed(6)),
        shrimpDensityDt: dt,
        behaviorClassificationCt: ct,
      },
      normalized: {
        normalizedRt,
        normalizedVt,
        normalizedDt,
        normalizedCt,
      },
      fisScore,
      appetiteLevel,
      confidence,
      weights: {
        ...weights,
        weightRt: Number(w1.toFixed(3)),
        weightVt: Number(w2.toFixed(3)),
        weightDt: Number(w3.toFixed(3)),
        weightCt: Number(w4.toFixed(3)),
      },
      isAnomaly,
      anomalyReason,
      metadata: {
        ...extraMetadata,
        calculatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Pipeline Luồng 1: YOLO11n-seg đo diện tích thức ăn còn lại (Rt) và mật độ tôm (Dt)
   */
  private async runYoloSegInference(
    frameData?: string,
    frameUrl?: string,
    roi?: Record<string, unknown>,
  ): Promise<YoloSegResult> {
    const aiEngineUrl = this.configService.get<string>('ai.engineUrl');

    if (!aiEngineUrl) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình địa chỉ AI Engine (AI_ENGINE_URL). Không thể kết nối mô hình YOLO11n-seg để phân tích thực tế!',
      );
    }

    try {
      const response = await fetch(`${aiEngineUrl}/vision/yolo-seg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameData, frameUrl, roi }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new BadGatewayException(
          `YOLO AI Engine tại ${aiEngineUrl}/vision/yolo-seg báo lỗi (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as YoloSegResult;
      if (typeof data.remainingFeedAreaRt !== 'number' || typeof data.shrimpDensityDt !== 'number') {
        throw new BadGatewayException(
          `Dữ liệu từ YOLO AI Engine (${aiEngineUrl}) không hợp lệ hoặc thiếu trường số liệu (remainingFeedAreaRt, shrimpDensityDt).`,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Không thể kết nối tới YOLO AI Engine tại ${aiEngineUrl}: ${message}`);
      throw new BadGatewayException(
        `Không thể kết nối tới dịch vụ AI YOLO11n-seg tại ${aiEngineUrl}: ${message}. Vui lòng kiểm tra dịch vụ AI Engine!`,
      );
    }
  }

  /**
   * Pipeline Luồng 2: MobileNetV3-Small phân loại hành vi ăn tức thời (Ct)
   */
  private async runMobileNetInference(
    frameData?: string,
    frameUrl?: string,
    roi?: Record<string, unknown>,
  ): Promise<MobileNetResult> {
    const aiEngineUrl = this.configService.get<string>('ai.engineUrl');

    if (!aiEngineUrl) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình địa chỉ AI Engine (AI_ENGINE_URL). Không thể kết nối mô hình MobileNetV3 để phân loại thực tế!',
      );
    }

    try {
      const response = await fetch(`${aiEngineUrl}/vision/mobilenet-classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameData, frameUrl, roi }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new BadGatewayException(
          `MobileNet AI Engine tại ${aiEngineUrl}/vision/mobilenet-classify báo lỗi (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as MobileNetResult;
      if (typeof data.behaviorClassificationCt !== 'number') {
        throw new BadGatewayException(
          `Dữ liệu từ MobileNet AI Engine (${aiEngineUrl}) không hợp lệ hoặc thiếu trường behaviorClassificationCt.`,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof BadGatewayException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Không thể kết nối tới MobileNet AI Engine tại ${aiEngineUrl}: ${message}`);
      throw new BadGatewayException(
        `Không thể kết nối tới dịch vụ AI MobileNetV3 tại ${aiEngineUrl}: ${message}. Vui lòng kiểm tra dịch vụ AI Engine!`,
      );
    }
  }

  private minMaxNormalize(val: number, min: number, max: number): number {
    if (max <= min) return 0;
    const clamped = Math.max(min, Math.min(max, val));
    return (clamped - min) / (max - min);
  }
}
