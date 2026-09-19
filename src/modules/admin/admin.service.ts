import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Device } from '../../database/entities/device.entity';
import { Alert } from '../../database/entities/alert.entity';
import {
  AlertSeverity,
  AlertStatus,
  DeviceStatus,
  FarmStatus,
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
  ) {}

  async getOverview() {
    // 1. User statistics
    const [totalUsers, activeUsers, lockedUsers, farmerUsers, adminUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isActive: false } }),
      this.userRepository.count({ where: { role: UserRole.FARMER } }),
      this.userRepository.count({ where: { role: UserRole.ADMIN } }),
    ]);

    // 2. Farm statistics
    const [totalFarms, activeFarms] = await Promise.all([
      this.farmRepository.count(),
      this.farmRepository.count({ where: { status: FarmStatus.ACTIVE } }),
    ]);

    // 3. Pond statistics
    const [totalPonds, activePonds, maintenancePonds] = await Promise.all([
      this.pondRepository.count(),
      this.pondRepository.count({ where: { status: PondStatus.ACTIVE } }),
      this.pondRepository.count({ where: { status: PondStatus.MAINTENANCE } }),
    ]);

    // 4. Device statistics (online via status or heartbeat within 5 minutes)
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

    // 5. Alert statistics
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

    // Top recent critical/warning alerts
    const recentAlerts = await this.alertRepository.find({
      order: { triggeredAt: 'DESC' },
      take: 10,
      relations: { pond: true, device: true },
    });

    // Offline devices list
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
}
