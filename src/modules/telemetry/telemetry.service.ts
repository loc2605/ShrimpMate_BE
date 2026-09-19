import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { RecordTelemetryDto } from './dto/record-telemetry.dto';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(TelemetryReading)
    private readonly readingRepository: Repository<TelemetryReading>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    private readonly pondAccessService: PondAccessService,
  ) {}

  async recordTelemetry(pondId: string, dto: RecordTelemetryDto, user?: User) {
    await this.ensurePondExists(pondId);
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, pondId);
    }

    const reading = this.readingRepository.create({
      pondId,
      deviceId: dto.deviceId ?? null,
      ph: dto.ph ?? null,
      dissolvedOxygenMgL: dto.dissolvedOxygenMgL ?? null,
      temperatureC: dto.temperatureC ?? null,
      salinityPpt: dto.salinityPpt ?? null,
      ammoniaMgL: dto.ammoniaMgL ?? null,
      turbidityNtu: dto.turbidityNtu ?? null,
      measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
    });

    return this.readingRepository.save(reading);
  }

  async getLatest(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const reading = await this.readingRepository.findOne({
      where: { pondId },
      order: { measuredAt: 'DESC' },
    });

    return reading ?? { message: 'Chưa có dữ liệu đo môi trường cho ao này' };
  }

  async getHistory(pondId: string, user: User, limit = 50) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    return this.readingRepository.find({
      where: { pondId },
      order: { measuredAt: 'DESC' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }
}
