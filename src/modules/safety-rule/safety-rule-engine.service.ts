import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SafetyRule } from '../../database/entities/safety-rule.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Device } from '../../database/entities/device.entity';
import { CameraFisLog } from '../../database/entities/camera-fis-log.entity';
import { AppetiteLevel, DeviceMode, DeviceStatus, SafetyDecision } from '../../database/entities/enums';

export interface SafetyEvaluationResult {
  decision: SafetyDecision;
  allowedAmountKg: number;
  requestedAmountKg: number;
  reasons: string[];
  appliedRules: string[];
  telemetrySnapshot: Partial<TelemetryReading> | null;
  visionSnapshot: Partial<CameraFisLog> | null;
}

interface ConditionItem {
  field?: string;
  operator?: '<' | '<=' | '>' | '>=' | '==' | '!=';
  value?: number;
  checkDevice?: boolean;
  checkVision?: boolean;
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
    @InjectRepository(CameraFisLog)
    private readonly cameraFisLogRepository: Repository<CameraFisLog>,
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

    // 3. Lấy chỉ số Camera AI Vision (FIS) mới nhất của ao
    const latestFis = await this.cameraFisLogRepository.findOne({
      where: { pondId },
      order: { timestamp: 'DESC' },
    });

    // 4. Lấy toàn bộ quy tắc an toàn đang kích hoạt
    const rules = await this.ruleRepository.find({
      where: { isEnabled: true },
      order: { priority: 'ASC' },
    });

    let currentDecision: SafetyDecision = SafetyDecision.ALLOWED;
    let allowedAmount = requestedAmountKg;
    const reasons: string[] = [];
    const appliedRules: string[] = [];

    // 5. Đánh giá qua bộ quy tắc an toàn động cấu hình trong CSDL
    for (const rule of rules) {
      const isTriggered = this.evaluateCondition(rule.condition, latestReading, device, latestFis);

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

    // 6. Quy tắc cốt lõi: Tích hợp chỉ số Camera AI Vision (FIS) vào quyết định cho ăn
    if (latestFis) {
      const fisAgeMinutes = (Date.now() - latestFis.timestamp.getTime()) / (1000 * 60);

      // Nếu dữ liệu FIS thu được gần đây (trong vòng 30 phút)
      if (fisAgeMinutes <= 30) {
        const remainingArea = Number(latestFis.remainingFeedAreaRt);

        // Mức 0: Không ăn (NONE)
        if (latestFis.appetiteLevel === AppetiteLevel.NONE) {
          if (remainingArea >= 0.5) {
            currentDecision = SafetyDecision.BLOCKED;
            allowedAmount = 0;
            reasons.push(
              `Camera AI: Tôm không bắt mồi (Mức 0) và diện tích thức ăn thừa ${(remainingArea * 100).toFixed(0)}% tại sàng. Hoãn cữ ăn để chống thối nước.`,
            );
          } else {
            if (currentDecision !== SafetyDecision.BLOCKED) {
              currentDecision = SafetyDecision.ADJUSTED;
              allowedAmount = Number((allowedAmount * 0.5).toFixed(3));
            }
            reasons.push(
              `Camera AI: Tôm không bắt mồi (Mức 0, FIS=${latestFis.fisScore}). Tự động giảm 50% lượng thức ăn.`,
            );
          }
        }
        // Mức 1: Ăn yếu (WEAK)
        else if (latestFis.appetiteLevel === AppetiteLevel.WEAK) {
          if (currentDecision !== SafetyDecision.BLOCKED) {
            currentDecision = SafetyDecision.ADJUSTED;
            allowedAmount = Number((allowedAmount * 0.65).toFixed(3));
          }
          reasons.push(
            `Camera AI: Mức bắt mồi yếu (Mức 1, FIS=${latestFis.fisScore}). Tự động giảm 35% lượng thức ăn.`,
          );
        }
      }
    }

    this.logger.log(
      `Đánh giá an toàn ao ${pondId}: Quyết định=${currentDecision}, Khối lượng cho phép=${allowedAmount}/${requestedAmountKg} kg (FIS=${latestFis?.fisScore ?? 'N/A'})`,
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
      visionSnapshot: latestFis
        ? {
            id: latestFis.id,
            timestamp: latestFis.timestamp,
            fisScore: latestFis.fisScore,
            appetiteLevel: latestFis.appetiteLevel,
            remainingFeedAreaRt: latestFis.remainingFeedAreaRt,
            shrimpDensityDt: latestFis.shrimpDensityDt,
            behaviorClassificationCt: latestFis.behaviorClassificationCt,
          }
        : null,
    };
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    reading: TelemetryReading | null,
    device: Device | null,
    vision: CameraFisLog | null,
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
        this.evaluateSingleCondition(subCond, reading, device, vision),
      );
    }

    // Điều kiện AND
    if (Array.isArray(condition.and)) {
      return (condition.and as ConditionItem[]).every((subCond) =>
        this.evaluateSingleCondition(subCond, reading, device, vision),
      );
    }

    // Điều kiện đơn lẻ
    return this.evaluateSingleCondition(condition as ConditionItem, reading, device, vision);
  }

  private evaluateSingleCondition(
    item: ConditionItem,
    reading: TelemetryReading | null,
    device: Device | null,
    vision: CameraFisLog | null,
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

    // Kiểm tra trường thuộc Vision (Camera FIS)
    if (item.checkVision || ['fisScore', 'remainingFeedAreaRt', 'shrimpDensityDt', 'appetiteLevel'].includes(item.field)) {
      if (!vision) return false;
      const rawVisionValue = (vision as unknown as Record<string, unknown>)[item.field];
      if (rawVisionValue === null || rawVisionValue === undefined) return false;
      return this.compareNumeric(Number(rawVisionValue), Number(item.value), item.operator);
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

