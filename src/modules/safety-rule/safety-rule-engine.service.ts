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
  ): Promise<SafetyEvaluationResult> {
    // 1. Lấy telemetry mới nhất của ao
    const latestReading = await this.readingRepository.findOne({
      where: { pondId },
      order: { measuredAt: 'DESC' },
    });

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

    for (const rule of rules) {
      const isTriggered = this.evaluateCondition(rule.condition, latestReading, device);

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
    };
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    reading: TelemetryReading | null,
    device: Device | null,
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
        this.evaluateSingleCondition(subCond, reading, device),
      );
    }

    // Điều kiện AND
    if (Array.isArray(condition.and)) {
      return (condition.and as ConditionItem[]).every((subCond) =>
        this.evaluateSingleCondition(subCond, reading, device),
      );
    }

    // Điều kiện đơn lẻ
    return this.evaluateSingleCondition(condition as ConditionItem, reading, device);
  }

  private evaluateSingleCondition(
    item: ConditionItem,
    reading: TelemetryReading | null,
    device: Device | null,
  ): boolean {
    if (item.checkDevice) {
      if (device) {
        return device.mode === DeviceMode.EMERGENCY_STOP || device.status === DeviceStatus.ERROR;
      }
      return false;
    }

    if (!item.field || !reading) {
      return false;
    }

    const rawValue = (reading as unknown as Record<string, unknown>)[item.field];
    if (rawValue === null || rawValue === undefined) {
      return false;
    }

    const val = Number(rawValue);
    const targetVal = Number(item.value);

    switch (item.operator) {
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
