import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Device } from '../../database/entities/device.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import {
  AlertSeverity,
  CropSeasonStatus,
  DeviceType,
  FeedingSource,
  FeedingStatus,
  SafetyDecision,
  UserRole,
} from '../../database/entities/enums';
import { User } from '../../database/entities/user.entity';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { MqttService } from '../../mqtt/mqtt.service';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../events/events.gateway';
import { AiIntegrationService } from '../ai-integration/ai-integration.service';
import { FeedingJobData, FeedingJobResult } from './feeding-queue.types';

@Injectable()
export class FeedingWorkerService {
  private readonly logger = new Logger(FeedingWorkerService.name);

  constructor(
    @InjectRepository(FeedingRecord)
    private readonly recordRepository: Repository<FeedingRecord>,
    @InjectRepository(FeedingSchedule)
    private readonly scheduleRepository: Repository<FeedingSchedule>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(CropSeason)
    private readonly cropSeasonRepository: Repository<CropSeason>,
    private readonly safetyRuleEngineService: SafetyRuleEngineService,
    private readonly mqttService: MqttService,
    private readonly alertsService: AlertsService,
    private readonly eventsGateway: EventsGateway,
    private readonly aiService: AiIntegrationService,
  ) {}

  /**
   * Xử lý thực thi 1 Job cữ ăn với cơ chế kiểm duyệt an toàn, phát lệnh MQTT và chờ xác nhận ACK
   */
  async processFeedingJob(jobData: FeedingJobData, jobId: string): Promise<FeedingJobResult> {
    const { scheduleId, pondId, scheduleName, scheduledTime, retryAttempt = 1 } = jobData;

    this.logger.log(
      `[FeedingWorker] Bắt đầu xử lý Job [${jobId}] - Cữ: ${scheduleName} (Lần thử: ${retryAttempt}/3)`,
    );

    // 1. Kiểm tra Vụ nuôi đang hoạt động
    const activeSeason = await this.cropSeasonRepository.findOne({
      where: { pondId, status: CropSeasonStatus.ACTIVE },
    });

    if (!activeSeason) {
      this.logger.warn(`[FeedingWorker] Ao ${pondId} không có vụ nuôi đang ACTIVE. Hủy Job [${jobId}].`);
      return { success: false, status: 'SKIPPED', message: 'Không có vụ nuôi đang hoạt động' };
    }

    // 2. Tìm thiết bị Máy cho ăn (Feeder) gắn vào ao này
    const feederDevice = await this.deviceRepository.findOne({
      where: { pondId, type: DeviceType.FEEDER },
    });

    if (!feederDevice) {
      this.logger.warn(`[FeedingWorker] Ao ${pondId} chưa được gán máy cho ăn (Feeder). Hủy Job [${jobId}].`);
      return { success: false, status: 'SKIPPED', message: 'Chưa gán máy cho ăn vào ao' };
    }

    // 3. Tính toán khối lượng thức ăn
    let requestedAmount = jobData.feedAmountKg ? Number(jobData.feedAmountKg) : 0;
    if (requestedAmount <= 0) {
      try {
        const systemUser = { role: UserRole.ADMIN } as User;
        const aiResult = await this.aiService.predictFeedDemand(pondId, systemUser);
        requestedAmount = aiResult.predictedFeedAmountKg;
        this.logger.log(
          `[FeedingWorker] AI đã tự động dự báo lượng ăn cho cữ [${scheduleName}]: ${requestedAmount} kg`,
        );
      } catch {
        requestedAmount = 10.0;
      }
    }

    // 4. KIỂM DUYỆT AN TOÀN QUA SAFETY RULE ENGINE
    const evaluation = await this.safetyRuleEngineService.evaluateFeedingSafety(
      pondId,
      feederDevice.id,
      requestedAmount,
    );

    // TRƯỜNG HỢP 1: BỊ CHẶN BỞI QUY TẮC AN TOÀN (BLOCKED)
    if (evaluation.decision === SafetyDecision.BLOCKED) {
      const reasonText = evaluation.reasons.join('; ') || 'Vi phạm ngưỡng an toàn môi trường nước';

      const blockedRecord = this.recordRepository.create({
        pondId,
        deviceId: feederDevice.id,
        scheduleId,
        startedAt: new Date(),
        finishedAt: new Date(),
        requestedAmountKg: requestedAmount,
        actualAmountKg: 0,
        source: FeedingSource.SCHEDULE,
        status: FeedingStatus.STOPPED,
        safetyDecision: SafetyDecision.BLOCKED,
        safetyReason: reasonText,
        stoppedReason: `Hệ thống tự động ngắt cữ ăn: ${reasonText}`,
      });

      const savedBlocked = await this.recordRepository.save(blockedRecord);

      await this.alertsService.createAlert({
        pondId,
        deviceId: feederDevice.id,
        type: 'AUTO_FEEDING_BLOCKED',
        severity: AlertSeverity.WARNING,
        message: `Cữ ăn tự động [${scheduleName}] lúc ${scheduledTime} bị chặn: ${reasonText}`,
      });

      this.eventsGateway.broadcastFeederStatus(pondId, {
        recordId: savedBlocked.id,
        scheduleId,
        name: scheduleName,
        status: FeedingStatus.STOPPED,
        safetyDecision: SafetyDecision.BLOCKED,
        reason: reasonText,
      });

      this.logger.warn(`[FeedingWorker] 🛑 Cữ ăn [${scheduleName}] ĐÃ BỊ CHẶN AN TOÀN: ${reasonText}`);
      return { success: true, recordId: savedBlocked.id, status: 'BLOCKED', message: reasonText };
    }

    // TRƯỜNG HỢP 2: ĐƯỢC PHÉP CHO ĂN (ALLOWED hoặc ADJUSTED)
    const allowedAmount = evaluation.allowedAmountKg;

    // Tìm xem đã tạo FeedingRecord cho Job này chưa (để không tạo trùng khi retry)
    let feedingRecord = await this.recordRepository.findOne({
      where: { scheduleId, status: FeedingStatus.RUNNING },
      order: { startedAt: 'DESC' },
    });

    if (!feedingRecord) {
      feedingRecord = this.recordRepository.create({
        pondId,
        deviceId: feederDevice.id,
        scheduleId,
        startedAt: new Date(),
        requestedAmountKg: requestedAmount,
        actualAmountKg: allowedAmount,
        source: FeedingSource.SCHEDULE,
        status: FeedingStatus.RUNNING,
        safetyDecision: evaluation.decision,
        safetyReason:
          evaluation.reasons.length > 0 ? evaluation.reasons.join('; ') : 'Chỉ số môi trường an toàn',
      });
      feedingRecord = await this.recordRepository.save(feedingRecord);
    }

    // 5. Gửi lệnh MQTT tới máy cho ăn
    const commandSent = await this.mqttService.publishFeederCommand(feederDevice.deviceUid, {
      command: 'FEED',
      feedAmountKg: allowedAmount,
      recordId: feedingRecord.id,
      spreadRateKgPerMinute: jobData.spreadRateKgPerMinute ? Number(jobData.spreadRateKgPerMinute) : undefined,
      timestamp: new Date().toISOString(),
    });

    if (!commandSent) {
      throw new Error(`Không thể gửi lệnh MQTT tới thiết bị ${feederDevice.deviceUid} (Broker offline)`);
    }

    this.eventsGateway.broadcastFeederStatus(pondId, {
      recordId: feedingRecord.id,
      scheduleId,
      name: scheduleName,
      status: FeedingStatus.RUNNING,
      amountKg: allowedAmount,
      safetyDecision: evaluation.decision,
      deviceUid: feederDevice.deviceUid,
      retryAttempt,
    });

    this.logger.log(
      `[FeedingWorker] 📡 Đã gửi lệnh FEED tới [${feederDevice.deviceUid}]. Đang chờ ACK xác nhận trong 20s...`,
    );

    // 6. CHỜ XÁC NHẬN ACK TỪ THIẾT BỊ (Timeout 20 giây)
    const ack = await this.mqttService.waitForFeederAck(feedingRecord.id, 20000);

    if (!ack || ack.status === 'NACK') {
      const errMsg = `Thiết bị [${feederDevice.deviceUid}] không phản hồi ACK sau 20s cho cữ [${scheduleName}] (Lần ${retryAttempt}/3)`;
      this.logger.warn(`[FeedingWorker] ⚠️ ${errMsg}`);
      throw new Error(errMsg);
    }

    this.logger.log(
      `[FeedingWorker] ✅ Nhận ACK xác nhận thành công từ máy [${feederDevice.deviceUid}]! Máy bắt đầu quay (${allowedAmount}kg).`,
    );

    return {
      success: true,
      recordId: feedingRecord.id,
      status: 'RUNNING',
      actualAmountKg: allowedAmount,
      message: 'Máy cho ăn đã tiếp nhận lệnh và đang hoạt động',
    };
  }

  /**
   * Xử lý khi cữ ăn thất bại hoàn toàn sau 3 lần thử lại (Retry Exhausted)
   */
  async handleJobFailure(jobData: FeedingJobData, error: Error): Promise<void> {
    const { scheduleId, pondId, scheduleName, scheduledTime } = jobData;
    this.logger.error(
      `[FeedingWorker] ❌ CỮ ĂN [${scheduleName}] THẤT BẠI HOÀN TOÀN SAU 3 LẦN THỬ LẠI: ${error.message}`,
    );

    // Cập nhật FeedingRecord sang trạng thái FAILED
    const lastRecord = await this.recordRepository.findOne({
      where: { scheduleId },
      order: { startedAt: 'DESC' },
    });

    if (lastRecord && lastRecord.status === FeedingStatus.RUNNING) {
      lastRecord.status = FeedingStatus.FAILED;
      lastRecord.finishedAt = new Date();
      lastRecord.stoppedReason = `Máy cho ăn không phản hồi sau 3 lần thử lại (mất kết nối hoặc sự cố phần cứng): ${error.message}`;
      await this.recordRepository.save(lastRecord);
    }

    // Bắn cảnh báo nguy cấp (CRITICAL)
    await this.alertsService.createAlert({
      pondId,
      type: 'DEVICE_ERROR',
      severity: AlertSeverity.CRITICAL,
      message: `SỰ CỐ MÁY CHO ĂN: Cữ ăn tự động [${scheduleName}] lúc ${scheduledTime} thất bại hoàn toàn sau 3 lần thử lại. Kiểm tra nguồn điện/WiFi máy ăn!`,
    });

    this.eventsGateway.broadcastFeederStatus(pondId, {
      scheduleId,
      name: scheduleName,
      status: FeedingStatus.FAILED,
      error: error.message,
    });
  }
}

