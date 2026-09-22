import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Device } from '../../database/entities/device.entity';
import { Alert } from '../../database/entities/alert.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import {
  AlertSeverity,
  AlertStatus,
  CropSeasonStatus,
  DeviceStatus,
  FarmStatus,
  FeedingStatus,
  PondStatus,
  UserRole,
} from '../../database/entities/enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(CropSeason)
    private readonly cropSeasonRepository: Repository<CropSeason>,
    @InjectRepository(FeedingRecord)
    private readonly feedingRecordRepository: Repository<FeedingRecord>,
  ) {}

  async getOverview() {
    // 1. Thống kê User
    const [totalUsers, activeUsers, lockedUsers, farmerUsers, adminUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isActive: false } }),
      this.userRepository.count({ where: { role: UserRole.FARMER } }),
      this.userRepository.count({ where: { role: UserRole.ADMIN } }),
    ]);

    // 2. Thống kê Farm
    const [totalFarms, activeFarms] = await Promise.all([
      this.farmRepository.count(),
      this.farmRepository.count({ where: { status: FarmStatus.ACTIVE } }),
    ]);

    // 3. Thống kê Pond
    const [totalPonds, activePonds, maintenancePonds] = await Promise.all([
      this.pondRepository.count(),
      this.pondRepository.count({ where: { status: PondStatus.ACTIVE } }),
      this.pondRepository.count({ where: { status: PondStatus.MAINTENANCE } }),
    ]);

    // 4. Thống kê Device
    const totalDevices = await this.deviceRepository.count();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineDevices = await this.deviceRepository
      .createQueryBuilder('device')
      .where('device.status = :onlineStatus OR device.last_seen_at >= :threshold', {
        onlineStatus: DeviceStatus.ONLINE,
        threshold: fiveMinutesAgo,
      })
      .getCount();
    const offlineDevices = Math.max(0, totalDevices - onlineDevices);
    const onlineRatePercent = totalDevices > 0 ? Number(((onlineDevices / totalDevices) * 100).toFixed(1)) : 0;

    // 5. Thống kê Alert
    const [totalAlerts, openAlerts, acknowledgedAlerts, resolvedAlerts, criticalAlerts, warningAlerts, monitoringAlerts] =
      await Promise.all([
        this.alertRepository.count(),
        this.alertRepository.count({ where: { status: AlertStatus.OPEN } }),
        this.alertRepository.count({ where: { status: AlertStatus.ACKNOWLEDGED } }),
        this.alertRepository.count({ where: { status: AlertStatus.RESOLVED } }),
        this.alertRepository.count({ where: { severity: AlertSeverity.CRITICAL } }),
        this.alertRepository.count({ where: { severity: AlertSeverity.WARNING } }),
        this.alertRepository.count({ where: { severity: AlertSeverity.MONITORING } }),
      ]);

    return {
      serverTime: new Date().toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        locked: lockedUsers,
        farmers: farmerUsers,
        admins: adminUsers,
      },
      farms: {
        total: totalFarms,
        active: activeFarms,
        inactive: Math.max(0, totalFarms - activeFarms),
      },
      ponds: {
        total: totalPonds,
        active: activePonds,
        maintenance: maintenancePonds,
        inactive: Math.max(0, totalPonds - activePonds - maintenancePonds),
      },
      devices: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
        onlineRatePercent,
      },
      alerts: {
        total: totalAlerts,
        open: openAlerts,
        acknowledged: acknowledgedAlerts,
        resolved: resolvedAlerts,
        bySeverity: {
          critical: criticalAlerts,
          warning: warningAlerts,
          monitoring: monitoringAlerts,
        },
      },
    };
  }

  async getOperationalReport() {
    const overview = await this.getOverview();

    // Top 10 cảnh báo gần nhất
    const recentAlerts = await this.alertRepository.find({
      order: { triggeredAt: 'DESC' },
      take: 10,
      relations: { pond: true, device: true },
    });

    // Danh sách thiết bị offline
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const offlineDevicesList = await this.deviceRepository
      .createQueryBuilder('device')
      .where('device.status != :onlineStatus AND (device.last_seen_at IS NULL OR device.last_seen_at < :threshold)', {
        onlineStatus: DeviceStatus.ONLINE,
        threshold: fiveMinutesAgo,
      })
      .orderBy('device.last_seen_at', 'ASC')
      .take(20)
      .getMany();

    return {
      generatedAt: new Date().toISOString(),
      overview,
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        status: a.status,
        message: a.message,
        pondName: a.pond?.name ?? null,
        deviceUid: a.device?.deviceUid ?? null,
        triggeredAt: a.triggeredAt,
      })),
      offlineDevices: offlineDevicesList.map((d) => ({
        id: d.id,
        deviceUid: d.deviceUid,
        name: d.name,
        type: d.type,
        firmwareVersion: d.firmwareVersion,
        lastSeenAt: d.lastSeenAt,
      })),
    };
  }

  async getFcrReport() {
    const seasons = await this.cropSeasonRepository.find({
      where: [
        { status: CropSeasonStatus.ACTIVE },
        { status: CropSeasonStatus.COMPLETED },
      ],
      relations: { pond: { farm: true } },
      order: { createdAt: 'DESC' },
    });

    const seasonFcrList = [];
    let totalFeedSystemKg = 0;
    let totalBiomassGainSystemKg = 0;

    for (const season of seasons) {
      const records = await this.feedingRecordRepository.find({
        where: { pondId: season.pondId },
      });

      const totalFeedKg = records.reduce((sum, r) => {
        if (r.status === FeedingStatus.COMPLETED && r.actualAmountKg) {
          return sum + Number(r.actualAmountKg);
        }
        if (r.status !== FeedingStatus.STOPPED && r.status !== FeedingStatus.FAILED) {
          return sum + (Number(r.actualAmountKg) || Number(r.requestedAmountKg) || 0);
        }
        return sum;
      }, 0);

      const stockingDate = new Date(season.stockingDate);
      const now = new Date();
      const doc = Math.max(1, Math.ceil((now.getTime() - stockingDate.getTime()) / (1000 * 60 * 60 * 24)));

      const initialCount = Number(season.initialCount) || 100000;
      const initialAvgWeightG = Number(season.initialAverageWeightG) || 0.02;
      const survivalRate = Number(season.estimatedSurvivalRate) || 80;
      const survivingCount = Math.round((initialCount * survivalRate) / 100);

      const currentAvgWeightG = Math.min(30, initialAvgWeightG + doc * 0.25);

      const initialBiomassKg = (initialCount * initialAvgWeightG) / 1000;
      const currentBiomassKg = (survivingCount * currentAvgWeightG) / 1000;
      const biomassGainKg = Math.max(1, currentBiomassKg - initialBiomassKg);

      const fcr = totalFeedKg > 0 ? Number((totalFeedKg / biomassGainKg).toFixed(2)) : null;

      let quality = 'Chưa xác định';
      if (fcr !== null) {
        if (fcr < 1.3) quality = 'Xuất sắc (< 1.3)';
        else if (fcr <= 1.5) quality = 'Tốt (1.3 - 1.5)';
        else quality = 'Cần tối ưu (> 1.5)';
      }

      totalFeedSystemKg += totalFeedKg;
      totalBiomassGainSystemKg += biomassGainKg;

      seasonFcrList.push({
        cropSeasonId: season.id,
        seasonName: season.name,
        status: season.status,
        farmName: season.pond?.farm?.name ?? 'Chưa gán Farm',
        pondName: season.pond?.name ?? 'Ao nuôi',
        daysOfCulture: doc,
        totalFeedConsumedKg: Number(totalFeedKg.toFixed(2)),
        estimatedCurrentBiomassKg: Number(currentBiomassKg.toFixed(2)),
        biomassGainKg: Number(biomassGainKg.toFixed(2)),
        fcr,
        qualityRating: quality,
      });
    }

    const systemFcr = totalBiomassGainSystemKg > 0 && totalFeedSystemKg > 0
      ? Number((totalFeedSystemKg / totalBiomassGainSystemKg).toFixed(2))
      : null;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalSeasonsEvaluated: seasonFcrList.length,
        totalFeedConsumedSystemKg: Number(totalFeedSystemKg.toFixed(2)),
        totalBiomassGainSystemKg: Number(totalBiomassGainSystemKg.toFixed(2)),
        averageSystemFcr: systemFcr,
        systemQualityRating: systemFcr
          ? (systemFcr < 1.3 ? 'Xuất sắc' : (systemFcr <= 1.5 ? 'Tốt' : 'Cần tối ưu'))
          : 'Chưa đủ dữ liệu',
      },
      seasons: seasonFcrList,
    };
  }
}
