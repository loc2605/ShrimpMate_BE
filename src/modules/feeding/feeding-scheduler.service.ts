import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
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
} from '../../database/entities/enums';
import { SafetyRuleEngineService } from '../safety-rule/safety-rule-engine.service';
import { MqttService } from '../../mqtt/mqtt.service';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class FeedingSchedulerService {
  private readonly logger = new Logger(FeedingSchedulerService.name);

  constructor(
    @InjectRepository(FeedingSchedule)
    private readonly scheduleRepository: Repository<FeedingSchedule>,
    @InjectRepository(FeedingRecord)
    private readonly recordRepository: Repository<FeedingRecord>,
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
  ) {}

  /**
   * Tiến trình chạy mỗi phút: Quét và kích hoạt các lịch cho ăn tự động đã định trước
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledFeeding() {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const currentTimeHHmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const currentDayOfWeek = now.getDay(); // 0 = Chủ nhật, 1 = Thứ hai, ... 6 = Thứ bảy

    // 1. Tìm toàn bộ lịch cho ăn đang được kích hoạt (isEnabled = true)
    const schedules = await this.scheduleRepository.find({
      where: { isEnabled: true },
      relations: { pond: true },
    });

    if (schedules.length === 0) return;

    // 2. Lọc các lịch trùng khớp với giờ hiện tại (HH:mm) và ngày trong tuần
    const dueSchedules = schedules.filter((s) => {
      const timeMatch = s.timeOfDay.startsWith(currentTimeHHmm);
      const dayMatch = Array.isArray(s.daysOfWeek) && s.daysOfWeek.includes(currentDayOfWeek);
      return timeMatch && dayMatch;
    });

    if (dueSchedules.length === 0) return;

    this.logger.log(
      `[FeedingScheduler] Phát hiện ${dueSchedules.length} cữ ăn tự động khớp thời gian (${currentTimeHHmm}, Thứ: ${currentDayOfWeek})`,
    );

    // Thời điểm bắt đầu của ngày hôm nay (00:00:00) để chống chạy lặp
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    for (const schedule of dueSchedules) {
      await this.executeSingleSchedule(schedule, startOfToday);
    }
  }

  private async executeSingleSchedule(schedule: FeedingSchedule, startOfToday: Date) {
    try {
      // 1. Kiểm tra chống chạy trùng lặp: xem hôm nay cữ ăn này đã có FeedingRecord chưa
      const existingToday = await this.recordRepository.findOne({
        where: {
          scheduleId: schedule.id,
          startedAt: MoreThanOrEqual(startOfToday),
        },
      });

      if (existingToday) {
        this.logger.debug(
          `[FeedingScheduler] Cữ ăn [${schedule.name}] cho ao ${schedule.pondId} đã được chạy hôm nay lúc ${existingToday.startedAt.toISOString()}, bỏ qua.`,
        );
        return;
      }

      // 2. Kiểm tra Vụ nuôi của Ao: bắt buộc phải có Crop Season đang ACTIVE
      const activeSeason = await this.cropSeasonRepository.findOne({
        where: { pondId: schedule.pondId, status: CropSeasonStatus.ACTIVE },
      });

      if (!activeSeason) {
        this.logger.warn(
          `[FeedingScheduler] Ao ${schedule.pond?.name || schedule.pondId} không có vụ nuôi nào đang hoạt động (ACTIVE), hủy cữ ăn tự động [${schedule.name}].`,
        );
        return;
      }

      // 3. Tìm thiết bị Máy cho ăn (Feeder) gắn vào ao này
      const feederDevice = await this.deviceRepository.findOne({
        where: { pondId: schedule.pondId, type: DeviceType.FEEDER },
      });

      const requestedAmount = Number(schedule.feedAmountKg) || 10.0;

      // 4. KIỂM DUYỆT AN TOÀN QUA SAFETY RULE ENGINE
      const evaluation = await this.safetyRuleEngineService.evaluateFeedingSafety(
        schedule.pondId,
        feederDevice?.id,
        requestedAmount,
      );

      // TRƯỜNG HỢP 1: BỊ CHẶN BỞI QUY TẮC AN TOÀN (BLOCKED)
      if (evaluation.decision === SafetyDecision.BLOCKED) {
        const reasonText = evaluation.reasons.join('; ') || 'Vi phạm ngưỡng an toàn môi trường nước';

        const blockedRecord = this.recordRepository.create({
          pondId: schedule.pondId,
          deviceId: feederDevice?.id ?? null,
          scheduleId: schedule.id,
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

        // Tạo cảnh báo cho ao
        await this.alertsService.createAlert({
          pondId: schedule.pondId,
          deviceId: feederDevice?.id ?? undefined,
          type: 'AUTO_FEEDING_BLOCKED',
          severity: AlertSeverity.WARNING,
          message: `Cữ ăn tự động [${schedule.name}] lúc ${schedule.timeOfDay} bị chặn: ${reasonText}`,
        });

        // Bắn WebSocket thông báo
        this.eventsGateway.broadcastFeederStatus(schedule.pondId, {
          recordId: savedBlocked.id,
          scheduleId: schedule.id,
          name: schedule.name,
          status: FeedingStatus.STOPPED,
          safetyDecision: SafetyDecision.BLOCKED,
          reason: reasonText,
        });

        this.logger.warn(
          `[FeedingScheduler] 🛑 Cữ ăn [${schedule.name}] cho ao ${schedule.pondId} ĐÃ BỊ CHẶN: ${reasonText}`,
        );
        return;
      }

      // TRƯỜNG HỢP 2: ĐƯỢC PHÉP CHO ĂN (ALLOWED hoặc ADJUSTED)
      const allowedAmount = evaluation.allowedAmountKg;

      const runningRecord = this.recordRepository.create({
        pondId: schedule.pondId,
        deviceId: feederDevice?.id ?? null,
        scheduleId: schedule.id,
        startedAt: new Date(),
        requestedAmountKg: requestedAmount,
        actualAmountKg: allowedAmount,
        source: FeedingSource.SCHEDULE,
        status: FeedingStatus.RUNNING,
        safetyDecision: evaluation.decision,
        safetyReason:
          evaluation.reasons.length > 0 ? evaluation.reasons.join('; ') : 'Chỉ số môi trường an toàn',
      });

      const savedRunning = await this.recordRepository.save(runningRecord);

      // Gửi lệnh điều khiển MQTT xuống máy cho ăn
      if (feederDevice?.deviceUid) {
        await this.mqttService.publishFeederCommand(feederDevice.deviceUid, {
          command: 'FEED',
          feedAmountKg: allowedAmount,
          recordId: savedRunning.id,
          spreadRateKgPerMinute: schedule.spreadRateKgPerMinute ? Number(schedule.spreadRateKgPerMinute) : undefined,
          timestamp: new Date().toISOString(),
        });
      }

      // Phát sự kiện WebSocket cho Web SCADA
      this.eventsGateway.broadcastFeederStatus(schedule.pondId, {
        recordId: savedRunning.id,
        scheduleId: schedule.id,
        name: schedule.name,
        status: FeedingStatus.RUNNING,
        amountKg: allowedAmount,
        safetyDecision: evaluation.decision,
        deviceUid: feederDevice?.deviceUid,
      });

      this.logger.log(
        `[FeedingScheduler] 🚀 ĐÃ KÍCH HOẠT CỮ ĂN TỰ ĐỘNG [${schedule.name}] (${allowedAmount}kg) cho ao ${schedule.pondId}`,
      );
    } catch (err) {
      this.logger.error(`[FeedingScheduler] Lỗi khi thực thi cữ ăn [${schedule.name}]`, err);
    }
  }
}
