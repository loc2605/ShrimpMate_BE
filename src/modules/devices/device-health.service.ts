import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Device } from '../../database/entities/device.entity';
import { AlertSeverity, DeviceStatus } from '../../database/entities/enums';
import { EventsGateway } from '../events/events.gateway';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class DeviceHealthService {
  private readonly logger = new Logger(DeviceHealthService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly eventsGateway: EventsGateway,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Quét định kỳ mỗi phút: Phát hiện các thiết bị (Sensor / Feeder) đã quá thời gian không gửi tín hiệu
   * Tự động chuyển trạng thái sang OFFLINE và gửi thông báo cảnh báo tới người nuôi
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleDeviceHeartbeatCheck(): Promise<void> {
    const staleMinutes = parseInt(process.env.DEVICE_STALE_TIMEOUT_MINUTES || '15', 10);
    const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000);

    try {
      const staleDevices = await this.deviceRepository
        .createQueryBuilder('dev')
        .leftJoinAndSelect('dev.pond', 'pond')
        .where('dev.status = :onlineStatus', { onlineStatus: DeviceStatus.ONLINE })
        .andWhere('(dev.last_seen_at < :threshold OR dev.last_seen_at IS NULL)', {
          threshold: staleThreshold,
        })
        .getMany();

      if (!staleDevices.length) {
        return;
      }

      this.logger.warn(
        `[DeviceHealth] Phát hiện ${staleDevices.length} thiết bị không gửi tín hiệu > ${staleMinutes} phút. Tiến hành chuyển sang OFFLINE...`,
      );

      for (const dev of staleDevices) {
        dev.status = DeviceStatus.OFFLINE;
        await this.deviceRepository.save(dev);

        // Phát WebSocket cập nhật trạng thái thiết bị thời gian thực
        this.eventsGateway.broadcastDeviceStatus(dev.id, {
          deviceUid: dev.deviceUid,
          name: dev.name,
          type: dev.type,
          status: DeviceStatus.OFFLINE,
          pondId: dev.pondId,
          lastSeenAt: dev.lastSeenAt,
          reason: `Không nhận được tín hiệu quá ${staleMinutes} phút`,
        });

        // Nếu thiết bị đang được gán vào ao nuôi, kích hoạt cảnh báo hệ thống
        if (dev.pondId) {
          const pondName = dev.pond?.name || dev.pondId;
          await this.alertsService.createAlert({
            pondId: dev.pondId,
            deviceId: dev.id,
            type: 'DEVICE_OFFLINE',
            severity: AlertSeverity.WARNING,
            message: `Thiết bị [${dev.name}] (${dev.deviceUid}) tại ao "${pondName}" mất kết nối quá ${staleMinutes} phút. Trạng thái đã chuyển sang OFFLINE.`,
            metadata: {
              deviceUid: dev.deviceUid,
              deviceType: dev.type,
              lastSeenAt: dev.lastSeenAt,
              staleMinutes,
            },
          });
        }

        this.logger.warn(
          `[DeviceHealth] ⚠️ Thiết bị [${dev.name}] (${dev.deviceUid}) đã chuyển trạng thái thành OFFLINE (Lần cuối hoạt động: ${dev.lastSeenAt ? dev.lastSeenAt.toISOString() : 'Chưa có dữ liệu'}).`,
        );
      }
    } catch (err: any) {
      this.logger.error(`[DeviceHealth] Lỗi trong quá trình quét thiết bị mất kết nối: ${err.message}`, err.stack);
    }
  }
}

