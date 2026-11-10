import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { FeedingQueueService } from './feeding-queue.service';

@Injectable()
export class FeedingSchedulerService {
  private readonly logger = new Logger(FeedingSchedulerService.name);

  constructor(
    @InjectRepository(FeedingSchedule)
    private readonly scheduleRepository: Repository<FeedingSchedule>,
    private readonly queueService: FeedingQueueService,
  ) {}

  /**
   * Tiến trình chạy mỗi phút: Quét lịch cho ăn và đẩy vào hàng đợi BullMQ với Idempotent Key
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledFeeding() {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const currentTimeHHmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const currentDayOfWeek = now.getDay(); // 0 = Chủ nhật, 1 = Thứ hai, ... 6 = Thứ bảy
    const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

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
      `[FeedingScheduler] Phát hiện ${dueSchedules.length} cữ ăn tự động khớp thời gian (${currentTimeHHmm}, Thứ: ${currentDayOfWeek}). Đang đẩy vào hàng đợi...`,
    );

    // 3. Đẩy từng cữ ăn vào BullMQ Queue với Idempotent Key
    for (const schedule of dueSchedules) {
      await this.queueService.enqueueFeedingJob({
        scheduleId: schedule.id,
        pondId: schedule.pondId,
        scheduleName: schedule.name,
        scheduledTime: currentTimeHHmm,
        dateKey,
        feedAmountKg: schedule.feedAmountKg ? Number(schedule.feedAmountKg) : undefined,
        spreadRateKgPerMinute: schedule.spreadRateKgPerMinute ? Number(schedule.spreadRateKgPerMinute) : undefined,
      });
    }
  }

  /**
   * Kích hoạt thủ công một lịch cho ăn (phục vụ test hoặc người nuôi bấm kích hoạt ngay)
   */
  async triggerScheduleImmediately(scheduleId: string): Promise<boolean> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: { pond: true },
    });

    if (!schedule) return false;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentTimeHHmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    return await this.queueService.enqueueFeedingJob({
      scheduleId: schedule.id,
      pondId: schedule.pondId,
      scheduleName: `${schedule.name} (Manual Trigger)`,
      scheduledTime: currentTimeHHmm,
      dateKey,
      feedAmountKg: schedule.feedAmountKg ? Number(schedule.feedAmountKg) : undefined,
      spreadRateKgPerMinute: schedule.spreadRateKgPerMinute ? Number(schedule.spreadRateKgPerMinute) : undefined,
    });
  }
}
