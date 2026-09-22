import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Alert } from '../../database/entities/alert.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AlertSeverity, AlertStatus, UserRole } from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { QueryAlertDto } from './dto/query-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    private readonly pondAccessService: PondAccessService,
  ) {}

  async getAllAlerts(user: User, queryDto?: QueryAlertDto) {
    const limit = queryDto?.limit ? Math.min(200, Math.max(1, queryDto.limit)) : 50;
    const page = queryDto?.page ? Math.max(1, queryDto.page) : 1;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Alert> = {};

    if (user.role === UserRole.FARMER) {
      const pondIds = await this.pondAccessService.findAssignedPondIds(user);
      if (!pondIds || pondIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      where.pondId = In(pondIds);
    }

    if (queryDto?.pondId) {
      // Nếu là farmer, kiểm tra quyền truy cập pondId được truyền vào
      if (user.role === UserRole.FARMER) {
        await this.pondAccessService.ensureCanAccess(user, queryDto.pondId);
      }
      where.pondId = queryDto.pondId;
    }

    if (queryDto?.deviceId) {
      where.deviceId = queryDto.deviceId;
    }

    if (queryDto?.status) {
      where.status = queryDto.status;
    }

    if (queryDto?.severity) {
      where.severity = queryDto.severity;
    }

    if (queryDto?.type) {
      where.type = queryDto.type;
    }

    const [items, total] = await this.alertRepository.findAndCount({
      where,
      order: { triggeredAt: 'DESC' },
      take: limit,
      skip,
      relations: { pond: true, device: true },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Giữ lại alias getAllAlertsForFarmer cho tương thích ngược
  async getAllAlertsForFarmer(user: User, queryDto?: QueryAlertDto) {
    return this.getAllAlerts(user, queryDto);
  }

  async getAlertsByPond(pondId: string, user: User, queryDto?: QueryAlertDto) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const limit = queryDto?.limit ? Math.min(200, Math.max(1, queryDto.limit)) : 50;
    const page = queryDto?.page ? Math.max(1, queryDto.page) : 1;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Alert> = { pondId };

    if (queryDto?.deviceId) {
      where.deviceId = queryDto.deviceId;
    }

    if (queryDto?.status) {
      where.status = queryDto.status;
    }

    if (queryDto?.severity) {
      where.severity = queryDto.severity;
    }

    if (queryDto?.type) {
      where.type = queryDto.type;
    }

    const [items, total] = await this.alertRepository.findAndCount({
      where,
      order: { triggeredAt: 'DESC' },
      take: limit,
      skip,
      relations: { pond: true, device: true },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAlertsSummary(user: User, pondId?: string) {
    let allowedPondIds: string[] | null = null;

    if (user.role === UserRole.FARMER) {
      allowedPondIds = await this.pondAccessService.findAssignedPondIds(user);
      if (!allowedPondIds || allowedPondIds.length === 0) {
        return {
          total: 0,
          open: 0,
          acknowledged: 0,
          resolved: 0,
          critical: 0,
          warning: 0,
          monitoring: 0,
        };
      }
    }

    if (pondId) {
      if (user.role === UserRole.FARMER) {
        await this.pondAccessService.ensureCanAccess(user, pondId);
      }
      allowedPondIds = [pondId];
    }

    const qb = this.alertRepository.createQueryBuilder('alert');
    if (allowedPondIds && allowedPondIds.length > 0) {
      qb.where('alert.pond_id IN (:...allowedPondIds)', { allowedPondIds });
    }

    const [total, open, acknowledged, resolved, critical, warning, monitoring] = await Promise.all([
      qb.clone().getCount(),
      qb.clone().andWhere('alert.status = :st', { st: AlertStatus.OPEN }).getCount(),
      qb.clone().andWhere('alert.status = :st', { st: AlertStatus.ACKNOWLEDGED }).getCount(),
      qb.clone().andWhere('alert.status = :st', { st: AlertStatus.RESOLVED }).getCount(),
      qb.clone().andWhere('alert.severity = :sv', { sv: AlertSeverity.CRITICAL }).getCount(),
      qb.clone().andWhere('alert.severity = :sv', { sv: AlertSeverity.WARNING }).getCount(),
      qb.clone().andWhere('alert.severity = :sv', { sv: AlertSeverity.MONITORING }).getCount(),
    ]);

    return {
      total,
      open,
      acknowledged,
      resolved,
      bySeverity: {
        critical,
        warning,
        monitoring,
      },
    };
  }

  async createAlert(data: {
    pondId: string;
    deviceId?: string;
    type: string;
    severity: AlertSeverity;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.ensurePondExists(data.pondId);

    const alert = this.alertRepository.create({
      pondId: data.pondId,
      deviceId: data.deviceId ?? null,
      type: data.type,
      severity: data.severity,
      status: AlertStatus.OPEN,
      message: data.message,
      triggeredAt: new Date(),
      metadata: data.metadata ?? {},
    });

    return this.alertRepository.save(alert);
  }

  async acknowledgeAlert(id: string, user: User) {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: { pond: true, device: true },
    });
    if (!alert) {
      throw new NotFoundException(`Không tìm thấy cảnh báo với id ${id}`);
    }

    await this.pondAccessService.ensureCanAccess(user, alert.pondId);

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    return this.alertRepository.save(alert);
  }

  async resolveAlert(id: string, user: User) {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: { pond: true, device: true },
    });
    if (!alert) {
      throw new NotFoundException(`Không tìm thấy cảnh báo với id ${id}`);
    }

    await this.pondAccessService.ensureCanAccess(user, alert.pondId);

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    return this.alertRepository.save(alert);
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }
}
