import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Alert } from '../../database/entities/alert.entity';
import { Device } from '../../database/entities/device.entity';
import { AlertSeverity, AlertStatus, DeviceStatus } from '../../database/entities/enums';
import { AlertsService } from '../alerts/alerts.service';
import {
  ThresholdViolation,
  WATER_QUALITY_THRESHOLDS,
} from './constants/water-threshold.constants';

@Injectable()
export class TelemetryThresholdService {
  private readonly logger = new Logger(TelemetryThresholdService.name);
  private readonly DEBOUNCE_WINDOW_MS = 15 * 60 * 1000; // 15 phút chống spam cảnh báo

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly alertsService: AlertsService,
  ) {}

  async checkThresholds(reading: TelemetryReading): Promise<ThresholdViolation[]> {
    // 1. Cập nhật thiết bị liên quan nếu có deviceId
    if (reading.deviceId) {
      await this.updateDeviceHeartbeat(reading.deviceId);
    }

    // 2. Thu thập danh sách vi phạm ngưỡng
    const violations = this.detectViolations(reading);
    if (violations.length === 0) {
      return [];
    }

    // 3. Xử lý lưu Alert cho từng vi phạm có cơ chế debounce chống spam
    for (const violation of violations) {
      await this.processViolationAlert(reading, violation);
    }

    return violations;
  }

  private detectViolations(reading: TelemetryReading): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // Kiểm tra Oxy hòa tan (DO)
    if (reading.dissolvedOxygenMgL !== null && reading.dissolvedOxygenMgL !== undefined) {
      const val = Number(reading.dissolvedOxygenMgL);
      const th = WATER_QUALITY_THRESHOLDS.dissolvedOxygenMgL;
      if (th.criticalMin !== undefined && val < th.criticalMin) {
        violations.push({
          parameter: 'dissolvedOxygenMgL',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.CRITICAL,
          alertType: 'CRITICAL_DO_LOW',
          message: `Nồng độ oxy hòa tan (DO) ở mức nguy cấp: ${val} ${th.unit} (ngưỡng tối thiểu ${th.criticalMin} ${th.unit}). Tôm có nguy cơ ngạt!`,
        });
      } else if (th.warningMin !== undefined && val < th.warningMin) {
        violations.push({
          parameter: 'dissolvedOxygenMgL',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.WARNING,
          alertType: 'WARNING_DO_LOW',
          message: `Nồng độ oxy hòa tan (DO) thấp: ${val} ${th.unit} (khuyến nghị >= ${th.optimalMin} ${th.unit}). Cần bật quạt nước.`,
        });
      }
    }

    // Kiểm tra pH
    if (reading.ph !== null && reading.ph !== undefined) {
      const val = Number(reading.ph);
      const th = WATER_QUALITY_THRESHOLDS.ph;
      if ((th.criticalMin !== undefined && val < th.criticalMin) || (th.criticalMax !== undefined && val > th.criticalMax)) {
        violations.push({
          parameter: 'ph',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.CRITICAL,
          alertType: 'CRITICAL_PH_OUT_OF_RANGE',
          message: `Độ pH vượt mức nguy hiểm: ${val} (phạm vi cho phép ${th.criticalMin} - ${th.criticalMax}). Nguy cơ sốc nước cao!`,
        });
      } else if ((th.warningMin !== undefined && val < th.warningMin) || (th.warningMax !== undefined && val > th.warningMax)) {
        violations.push({
          parameter: 'ph',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.WARNING,
          alertType: 'WARNING_PH_ABNORMAL',
          message: `Độ pH bất thường: ${val} (khoảng tối ưu ${th.optimalMin} - ${th.optimalMax}). Cần kiểm tra độ kiềm.`,
        });
      }
    }

    // Kiểm tra Nhiệt độ
    if (reading.temperatureC !== null && reading.temperatureC !== undefined) {
      const val = Number(reading.temperatureC);
      const th = WATER_QUALITY_THRESHOLDS.temperatureC;
      if ((th.criticalMin !== undefined && val < th.criticalMin) || (th.criticalMax !== undefined && val > th.criticalMax)) {
        violations.push({
          parameter: 'temperatureC',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.CRITICAL,
          alertType: 'CRITICAL_TEMPERATURE',
          message: `Nhiệt độ nước cực đoan: ${val} ${th.unit} (phạm vi sống ${th.criticalMin} - ${th.criticalMax} ${th.unit}).`,
        });
      } else if ((th.warningMin !== undefined && val < th.warningMin) || (th.warningMax !== undefined && val > th.warningMax)) {
        violations.push({
          parameter: 'temperatureC',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.WARNING,
          alertType: 'WARNING_TEMPERATURE',
          message: `Nhiệt độ nước chênh lệch: ${val} ${th.unit} (tối ưu ${th.optimalMin} - ${th.optimalMax} ${th.unit}).`,
        });
      }
    }

    // Kiểm tra Ammonia (NH3/TAN)
    if (reading.ammoniaMgL !== null && reading.ammoniaMgL !== undefined) {
      const val = Number(reading.ammoniaMgL);
      const th = WATER_QUALITY_THRESHOLDS.ammoniaMgL;
      if (th.criticalMax !== undefined && val > th.criticalMax) {
        violations.push({
          parameter: 'ammoniaMgL',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.CRITICAL,
          alertType: 'CRITICAL_AMMONIA_HIGH',
          message: `Khí độc Ammonia (NH3) vượt ngưỡng độc tính nghiêm trọng: ${val} ${th.unit} (tối đa cho phép ${th.criticalMax} ${th.unit}).`,
        });
      } else if (th.warningMax !== undefined && val > th.warningMax) {
        violations.push({
          parameter: 'ammoniaMgL',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.WARNING,
          alertType: 'WARNING_AMMONIA_HIGH',
          message: `Khí độc Ammonia (NH3) tăng cao: ${val} ${th.unit} (ngưỡng an toàn <= ${th.warningMax} ${th.unit}).`,
        });
      }
    }

    // Kiểm tra Độ mặn
    if (reading.salinityPpt !== null && reading.salinityPpt !== undefined) {
      const val = Number(reading.salinityPpt);
      const th = WATER_QUALITY_THRESHOLDS.salinityPpt;
      if ((th.criticalMin !== undefined && val < th.criticalMin) || (th.criticalMax !== undefined && val > th.criticalMax)) {
        violations.push({
          parameter: 'salinityPpt',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.CRITICAL,
          alertType: 'CRITICAL_SALINITY',
          message: `Độ mặn nguy hiểm: ${val} ${th.unit} (phạm vi an toàn ${th.criticalMin} - ${th.criticalMax} ${th.unit}).`,
        });
      } else if ((th.warningMin !== undefined && val < th.warningMin) || (th.warningMax !== undefined && val > th.warningMax)) {
        violations.push({
          parameter: 'salinityPpt',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.WARNING,
          alertType: 'WARNING_SALINITY',
          message: `Độ mặn lệch chuẩn: ${val} ${th.unit} (khoảng tối ưu ${th.optimalMin} - ${th.optimalMax} ${th.unit}).`,
        });
      }
    }

    // Kiểm tra Độ đục
    if (reading.turbidityNtu !== null && reading.turbidityNtu !== undefined) {
      const val = Number(reading.turbidityNtu);
      const th = WATER_QUALITY_THRESHOLDS.turbidityNtu;
      if (th.criticalMax !== undefined && val > th.criticalMax) {
        violations.push({
          parameter: 'turbidityNtu',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.CRITICAL,
          alertType: 'CRITICAL_TURBIDITY_HIGH',
          message: `Độ đục nước quá cao: ${val} ${th.unit} (tối đa ${th.criticalMax} ${th.unit}). Nước quá nhiều phù sa hoặc tảo tàn.`,
        });
      } else if (th.warningMax !== undefined && val > th.warningMax) {
        violations.push({
          parameter: 'turbidityNtu',
          name: th.name,
          unit: th.unit,
          currentValue: val,
          severity: AlertSeverity.WARNING,
          alertType: 'WARNING_TURBIDITY_HIGH',
          message: `Độ đục nước cảnh báo: ${val} ${th.unit} (khoảng tối ưu ${th.optimalMin} - ${th.optimalMax} ${th.unit}).`,
        });
      }
    }

    return violations;
  }

  private async processViolationAlert(reading: TelemetryReading, violation: ThresholdViolation) {
    const debounceSince = new Date(Date.now() - this.DEBOUNCE_WINDOW_MS);

    // Kiểm tra xem đã có alert cùng type đang OPEN trong 15 phút gần nhất chưa
    const existingAlert = await this.alertRepository.findOne({
      where: {
        pondId: reading.pondId,
        type: violation.alertType,
        status: AlertStatus.OPEN,
        triggeredAt: MoreThan(debounceSince),
      },
    });

    if (existingAlert) {
      this.logger.debug(
        `[Debounce] Bỏ qua sinh alert trùng lặp cho pond ${reading.pondId}, type ${violation.alertType}`,
      );
      return;
    }

    await this.alertsService.createAlert({
      pondId: reading.pondId,
      deviceId: reading.deviceId ?? undefined,
      type: violation.alertType,
      severity: violation.severity,
      message: violation.message,
      metadata: {
        parameter: violation.parameter,
        currentValue: violation.currentValue,
        unit: violation.unit,
        measuredAt: reading.measuredAt,
        readingId: reading.id,
      },
    });

    this.logger.warn(`Đã tự động tạo cảnh báo: ${violation.message} (Ao: ${reading.pondId})`);
  }

  private async updateDeviceHeartbeat(deviceId: string) {
    try {
      const device = await this.deviceRepository.findOne({ where: { id: deviceId } });
      if (device) {
        device.lastSeenAt = new Date();
        if (device.status === DeviceStatus.OFFLINE) {
          device.status = DeviceStatus.ONLINE;
        }
        await this.deviceRepository.save(device);
      }
    } catch (err) {
      this.logger.error(`Không thể cập nhật heartbeat cho thiết bị ${deviceId}`, err);
    }
  }
}
