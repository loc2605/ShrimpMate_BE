import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // 1. Lấy telemetry mới nhất và cữ trước để tính deltaTan
    const recentReadings = await this.readingRepository.find({
      where: { pondId },
      order: { measuredAt: 'DESC' },
      take: 2,
    });
    const latestReading = recentReadings[0] ?? null;

    let computedDeltaTan = 0;
    if (recentReadings.length >= 2) {
      const tanLatest = Number(recentReadings[0].ammoniaMgL) || 0;
      const tanPrev = Number(recentReadings[1].ammoniaMgL) || 0;
      computedDeltaTan = Number((tanLatest - tanPrev).toFixed(3));
    }
    const deltaTan = contextOverrides?.deltaTan !== undefined
      ? contextOverrides.deltaTan
      : computedDeltaTan;
    const morningRainMm = contextOverrides?.morningRainMm ?? 0.0;

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
    const reasons: string[] = [];
    const appliedRules: string[] = [];

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
        }
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
            turbidityNtu: latestReading.turbidityNtu,
          }
        : null,
      contextSnapshot: {
        deltaTan,
        morningRainMm,
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

    // Kiểm tra các trường tính toán từ môi trường & thời tiết (ΔTAN, Lượng mưa)
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
