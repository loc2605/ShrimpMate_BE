import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { SafetyRule } from '../../database/entities/safety-rule.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Device } from '../../database/entities/device.entity';
import { DeviceMode, DeviceStatus, SafetyDecision } from '../../database/entities/enums';

export interface SafetyEvaluationResult {
  decision: SafetyDecision;
  allowedAmountKg: number;
  requestedAmountKg: number;
  reasons: string[];
  appliedRules: string[];
  telemetrySnapshot: Partial<TelemetryReading> | null;
  contextSnapshot?: {
    deltaTan?: number;
    morningRainMm?: number;
    predictedDo1h?: number;
    predictedDo2h?: number;
    isAdaptiveAdjusted?: boolean;
  };
}

interface ConditionItem {
  field?: string;
  operator?: '<' | '<=' | '>' | '>=' | '==' | '!=';
  value?: number;
  checkDevice?: boolean;
}

@Injectable()
export class SafetyRuleEngineService {
  private readonly logger = new Logger(SafetyRuleEngineService.name);

  constructor(
    @InjectRepository(SafetyRule)
    private readonly ruleRepository: Repository<SafetyRule>,
    @InjectRepository(TelemetryReading)
    private readonly readingRepository: Repository<TelemetryReading>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async evaluateFeedingSafety(
    pondId: string,
    deviceId?: string,
    requestedAmountKg = 10.0,
    contextOverrides?: {
      morningRainMm?: number;
      deltaTan?: number;
    },
  ): Promise<SafetyEvaluationResult> {
    // 1. Lấy telemetry mới nhất và hai số đo TAN gần nhất.
    const recentReadings = await this.readingRepository.find({
      where: { pondId },
      order: { measuredAt: 'DESC' },
      take: 2,
    });
    const latestReading = recentReadings[0] ?? null;

    const recentTanReadings = await this.readingRepository.find({
      where: { pondId, tanMgL: Not(IsNull()) },
      order: { measuredAt: 'DESC' },
      take: 2,
    });
    let computedDeltaTan = 0;
    if (recentTanReadings.length >= 2) {
      const tanLatest = Number(recentTanReadings[0].tanMgL);
      const tanPrevious = Number(recentTanReadings[1].tanMgL);
      if (Number.isFinite(tanLatest) && Number.isFinite(tanPrevious)) {
        computedDeltaTan = Number((tanLatest - tanPrevious).toFixed(3));
      }
    }
    const deltaTan = contextOverrides?.deltaTan !== undefined
      ? contextOverrides.deltaTan
      : computedDeltaTan;

    let computedRain = 0.0;
    if (latestReading?.rawData) {
      const rawRain = latestReading.rawData['rainMm'] ?? latestReading.rawData['morningRainMm'];
      if (rawRain !== undefined && !isNaN(Number(rawRain))) {
        computedRain = Number(rawRain);
      }
    }
    const morningRainMm = contextOverrides?.morningRainMm !== undefined
      ? contextOverrides.morningRainMm
      : computedRain;

    // 2. Lấy thông tin thiết bị (nếu có)
    let device: Device | null = null;
    if (deviceId) {
      device = await this.deviceRepository.findOne({ where: { id: deviceId } });
    }

    // 3. Lấy toàn bộ quy tắc an toàn đang kích hoạt
    const rules = await this.ruleRepository.find({
      where: { isEnabled: true },
      order: { priority: 'ASC' },
    });

    let currentDecision: SafetyDecision = SafetyDecision.ALLOWED;
    let allowedAmount = requestedAmountKg;
    let doRuleAdjusted = false;
    const reasons: string[] = [];
    const appliedRules: string[] = [];

    // 3.1. KIỂM TRA ĐỘ TƯƠI CỦA DỮ LIỆU CẢM BIẾN (Telemetry Freshness Check)
    // Nếu ao không có dữ liệu đo đạc nào, hoặc dữ liệu đo mới nhất đã quá 30 phút -> Cảm biến bị mất tín hiệu/offline
    const MAX_STALE_MINUTES = 30;
    if (!latestReading) {
      currentDecision = SafetyDecision.BLOCKED;
      allowedAmount = 0;
      appliedRules.push('NO_TELEMETRY_DATA');
      reasons.push('Ao chưa có bất kỳ dữ liệu đo đạc cảm biến nào. Cữ ăn bị chặn để đảm bảo an toàn!');
    } else {
      const readingAgeMinutes = Math.floor(
        (Date.now() - new Date(latestReading.measuredAt).getTime()) / (1000 * 60),
      );
      if (readingAgeMinutes > MAX_STALE_MINUTES) {
        currentDecision = SafetyDecision.BLOCKED;
        allowedAmount = 0;
        appliedRules.push('STALE_SENSOR_DATA');
        reasons.push(
          `Dữ liệu cảm biến môi trường đã quá cũ (${readingAgeMinutes} phút trước > giới hạn an toàn ${MAX_STALE_MINUTES} phút). Trạm cảm biến có thể đang mất tín hiệu, cữ ăn tự động bị hủy để phòng ngừa rủi ro!`,
        );
      }
    }

    // 4. Đánh giá qua bộ quy tắc an toàn động cấu hình trong CSDL (dựa trên cảm biến nước và thiết bị)
    for (const rule of rules) {
      const isTriggered = this.evaluateCondition(
        rule.condition,
        latestReading,
        device,
        deltaTan,
        morningRainMm,
      );

      if (isTriggered) {
        appliedRules.push(rule.code);
        const actionDecision = (rule.action?.decision as string)?.toLowerCase();
        const actionReason = (rule.action?.reason as string) || `Vi phạm quy tắc ${rule.name}`;

        reasons.push(actionReason);

        if (actionDecision === 'blocked') {
          currentDecision = SafetyDecision.BLOCKED;
          allowedAmount = 0;
        } else if (actionDecision === 'adjusted' && currentDecision !== SafetyDecision.BLOCKED) {
          currentDecision = SafetyDecision.ADJUSTED;
          const factor = Number(rule.action?.factor) || 0.5;
          allowedAmount = Number((allowedAmount * factor).toFixed(3));
          if (this.conditionUsesField(rule.condition, 'dissolvedOxygenMgL')) {
            doRuleAdjusted = true;
          }
        }
      }
    }

    // 5. NÂNG CẤP DỰ BÁO XU HƯỚNG TRƯỚC CỮ ĂN (Pre-feeding DO Trend Prediction & Adaptive Feeding)
    let predictedDo1h: number | undefined;
    let predictedDo2h: number | undefined;
    let isAdaptiveAdjusted = false;

    if (currentDecision !== SafetyDecision.BLOCKED && latestReading?.dissolvedOxygenMgL) {
      const currentDo = Number(latestReading.dissolvedOxygenMgL);

      // Tính tốc độ biến thiên DO trong các lần đo gần đây
      let doSlopePerHour = 0;
      if (recentReadings.length >= 2 && recentReadings[1].dissolvedOxygenMgL) {
        const prevDo = Number(recentReadings[1].dissolvedOxygenMgL);
        const timeDiffHours = Math.max(
          0.05,
          (new Date(latestReading.measuredAt).getTime() - new Date(recentReadings[1].measuredAt).getTime()) /
            (1000 * 3600),
        );
        doSlopePerHour = (currentDo - prevDo) / timeDiffHours;
        // Giới hạn tốc độ biến thiên DO tối đa trong ngưỡng sinh học tự nhiên (±2.5 mg/L mỗi giờ)
        doSlopePerHour = Math.max(-2.5, Math.min(2.5, doSlopePerHour));
      }

      // Chu kỳ ngày đêm (đêm/sáng sớm: tảo hô hấp làm DO tự nhiên giảm)
      const currentHour = new Date().getHours();
      let diurnalDrop = 0;
      if (currentHour >= 18 || currentHour <= 6) {
        diurnalDrop = 0.35;
      }

      // Tác động oxy sinh học sau khi cho ăn (BOD demand do tôm tranh mồi và phân hủy cám)
      const feedOxygenDemand = 0.25 * Math.min(2.0, allowedAmount / 8.0);

      const rawDo1h = currentDo + doSlopePerHour - diurnalDrop - feedOxygenDemand;
      const rawDo2h = currentDo + doSlopePerHour * 2 - diurnalDrop * 2 - feedOxygenDemand;

      // Giới hạn trong khoảng bão hòa sinh học và thực tế của nước (0.0 đến 15.0 mg/L)
      predictedDo1h = Number(Math.max(0, Math.min(15, rawDo1h)).toFixed(2));
      predictedDo2h = Number(Math.max(0, Math.min(15, rawDo2h)).toFixed(2));

      // Heuristic của đề tài; ngưỡng dự báo 3.2 mg/L không phải giới hạn QCVN.
      // A configured DO adjustment takes precedence to avoid reducing for the same risk twice.
      if (
        !doRuleAdjusted &&
        currentDo >= 3.5 &&
        (predictedDo2h < 3.2 || predictedDo1h < 3.2)
      ) {
        currentDecision = SafetyDecision.ADJUSTED;
        allowedAmount = Number((allowedAmount * 0.6).toFixed(3)); // Giảm 40% lượng thức ăn
        isAdaptiveAdjusted = true;
        const trendReason = `Dự báo xu hướng DO tụt xuống ${predictedDo2h} mg/L trong 2 giờ tới (nhu cầu oxy tăng sau khi ăn). Hệ thống tự động giảm 40% lượng thức ăn để chống ngạt tôm.`;
        reasons.push(trendReason);
        appliedRules.push('ADAPTIVE_FEEDING_PREDICTED_DO_DROP');
        this.logger.warn(`[SafetyRuleEngine] ${trendReason} (Khẩu phần điều chỉnh: ${allowedAmount}kg)`);
      }
    }

    this.logger.log(
      `Đánh giá an toàn ao ${pondId}: Quyết định=${currentDecision}, Khối lượng cho phép=${allowedAmount}/${requestedAmountKg} kg`,
    );

    return {
      decision: currentDecision,
      allowedAmountKg: allowedAmount,
      requestedAmountKg,
      reasons,
      appliedRules,
      telemetrySnapshot: latestReading
        ? {
            id: latestReading.id,
            measuredAt: latestReading.measuredAt,
            ph: latestReading.ph,
            dissolvedOxygenMgL: latestReading.dissolvedOxygenMgL,
            temperatureC: latestReading.temperatureC,
            salinityPpt: latestReading.salinityPpt,
            ammoniaMgL: latestReading.ammoniaMgL,
            tanMgL: latestReading.tanMgL,
            turbidityNtu: latestReading.turbidityNtu,
          }
        : null,
      contextSnapshot: {
        deltaTan,
        morningRainMm,
        predictedDo1h,
        predictedDo2h,
        isAdaptiveAdjusted,
      },
    };
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    reading: TelemetryReading | null,
    device: Device | null,
    deltaTan = 0,
    morningRainMm = 0,
  ): boolean {
    if (!condition) return false;

    // Kiểm tra điều kiện thiết bị
    if (condition.checkDevice) {
      if (device) {
        if (device.mode === DeviceMode.EMERGENCY_STOP || device.status === DeviceStatus.ERROR) {
          return true;
        }
      }
      return false;
    }

    // Điều kiện OR
    if (Array.isArray(condition.or)) {
      return (condition.or as ConditionItem[]).some((subCond) =>
        this.evaluateSingleCondition(subCond, reading, device, deltaTan, morningRainMm),
      );
    }

    // Điều kiện AND
    if (Array.isArray(condition.and)) {
      return (condition.and as ConditionItem[]).every((subCond) =>
        this.evaluateSingleCondition(subCond, reading, device, deltaTan, morningRainMm),
      );
    }

    // Điều kiện đơn lẻ
    return this.evaluateSingleCondition(condition as ConditionItem, reading, device, deltaTan, morningRainMm);
  }

  private conditionUsesField(condition: Record<string, unknown>, field: string): boolean {
    if (condition.field === field) {
      return true;
    }

    return ['and', 'or'].some((operator) => {
      const nestedConditions = condition[operator];
      return (
        Array.isArray(nestedConditions) &&
        nestedConditions.some(
          (nestedCondition) =>
            typeof nestedCondition === 'object' &&
            nestedCondition !== null &&
            !Array.isArray(nestedCondition) &&
            this.conditionUsesField(nestedCondition as Record<string, unknown>, field),
        )
      );
    });
  }

  private evaluateSingleCondition(
    item: ConditionItem,
    reading: TelemetryReading | null,
    device: Device | null,
    deltaTan = 0,
    morningRainMm = 0,
  ): boolean {
    if (item.checkDevice) {
      if (device) {
        return device.mode === DeviceMode.EMERGENCY_STOP || device.status === DeviceStatus.ERROR;
      }
      return false;
    }

    if (!item.field) {
      return false;
    }

    // Kiểm tra các trường heuristic tính toán từ ammonia và thời tiết.
    if (item.field === 'deltaTan') {
      return this.compareNumeric(deltaTan, Number(item.value), item.operator);
    }
    if (item.field === 'morningRainMm') {
      return this.compareNumeric(morningRainMm, Number(item.value), item.operator);
    }

    // Kiểm tra trường thuộc Telemetry
    if (!reading) return false;

    const rawValue = (reading as unknown as Record<string, unknown>)[item.field];
    if (rawValue === null || rawValue === undefined) {
      return false;
    }

    return this.compareNumeric(Number(rawValue), Number(item.value), item.operator);
  }

  private compareNumeric(val: number, targetVal: number, operator?: string): boolean {
    switch (operator) {
      case '<':
        return val < targetVal;
      case '<=':
        return val <= targetVal;
      case '>':
        return val > targetVal;
      case '>=':
        return val >= targetVal;
      case '==':
        return val === targetVal;
      case '!=':
        return val !== targetVal;
      default:
        return false;
    }
  }
}
