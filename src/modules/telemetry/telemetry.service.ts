import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { User } from '../../database/entities/user.entity';
import { RecordTelemetryDto } from './dto/record-telemetry.dto';
import { QueryTelemetryDto } from './dto/query-telemetry.dto';
import { TelemetryThresholdService } from './telemetry-threshold.service';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(TelemetryReading)
    private readonly readingRepository: Repository<TelemetryReading>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    private readonly pondAccessService: PondAccessService,
    private readonly telemetryThresholdService: TelemetryThresholdService,
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

    const saved = await this.readingRepository.save(reading);

    // Kích hoạt kiểm tra ngưỡng nước và tự động sinh cảnh báo nếu vượt ngưỡng
    const violations = await this.telemetryThresholdService.checkThresholds(saved);

    return {
      ...saved,
      violationsCount: violations.length,
      violations: violations.map((v) => ({
        parameter: v.parameter,
        name: v.name,
        currentValue: v.currentValue,
        unit: v.unit,
        severity: v.severity,
        message: v.message,
      })),
    };
  }

  async getLatest(pondId: string, user: User) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const reading = await this.readingRepository.findOne({
      where: { pondId },
      order: { measuredAt: 'DESC' },
      relations: { device: true },
    });

    return reading ?? { message: 'Chưa có dữ liệu đo môi trường cho ao này' };
  }

  async getHistory(pondId: string, user: User, queryDto?: QueryTelemetryDto) {
    await this.ensurePondExists(pondId);
    await this.pondAccessService.ensureCanAccess(user, pondId);

    const limit = queryDto?.limit ? Math.min(500, Math.max(1, queryDto.limit)) : 50;
    const page = queryDto?.page ? Math.max(1, queryDto.page) : 1;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { pondId };

    if (queryDto?.deviceId) {
      where.deviceId = queryDto.deviceId;
    }

    if (queryDto?.startDate && queryDto?.endDate) {
      where.measuredAt = Between(new Date(queryDto.startDate), new Date(queryDto.endDate));
    } else if (queryDto?.startDate) {
      where.measuredAt = MoreThanOrEqual(new Date(queryDto.startDate));
    } else if (queryDto?.endDate) {
      where.measuredAt = LessThanOrEqual(new Date(queryDto.endDate));
    }

    const [items, total] = await this.readingRepository.findAndCount({
      where,
      order: { measuredAt: 'DESC' },
      take: limit,
      skip,
      relations: { device: true },
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }
}
