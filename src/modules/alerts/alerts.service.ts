import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../../database/entities/alert.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AlertSeverity, AlertStatus } from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    private readonly pondAccessService: PondAccessService,
  ) {}

  async getAlertsByPond(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    return this.alertRepository.find({
      where: { pondId },
      order: { triggeredAt: 'DESC' },
      relations: { device: true },
    });
  }

  async getAllAlertsForFarmer(user: User) {
    const pondIds = await this.pondAccessService.findAssignedPondIds(user);
    if (!pondIds || pondIds.length === 0) {
      return [];
    }

    return this.alertRepository.find({
      where: pondIds.map((pondId) => ({ pondId })),
      order: { triggeredAt: 'DESC' },
      relations: { pond: true, device: true },
    });
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
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Không tìm thấy cảnh báo với id ${id}`);
    }

    await this.pondAccessService.ensureCanAccess(user, alert.pondId);

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    return this.alertRepository.save(alert);
  }

  async resolveAlert(id: string, user: User) {
    const alert = await this.alertRepository.findOne({ where: { id } });
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
