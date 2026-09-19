import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { CropSeasonStatus } from '../../database/entities/enums';
import { CreateCropSeasonDto } from './dto/create-crop-season.dto';
import { UpdateCropSeasonDto } from './dto/update-crop-season.dto';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';

@Injectable()
export class CropSeasonService {
  constructor(
    @InjectRepository(CropSeason)
    private readonly cropSeasonRepository: Repository<CropSeason>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(FeedingRecord)
    private readonly feedingRecordRepository: Repository<FeedingRecord>,
    private readonly pondAccessService: PondAccessService,
  ) {}

  async create(pondId: string, createDto: CreateCropSeasonDto, user?: User) {
    await this.findPond(pondId);
    if (user) await this.pondAccessService.ensureCanAccess(user, pondId);
    this.validateStockingDate(createDto.stockingDate);
    await this.ensureNoActiveSeason(pondId, createDto.status);

    const cropSeason = this.cropSeasonRepository.create({
      ...createDto,
      pondId,
      name: createDto.name.trim(),
      status: createDto.status ?? CropSeasonStatus.PLANNED,
      initialAverageWeightG: createDto.initialAverageWeightG ?? null,
      estimatedSurvivalRate: createDto.estimatedSurvivalRate ?? null,
    });

    try {
      return await this.cropSeasonRepository.save(cropSeason);
    } catch (error) {
      this.throwActiveSeasonConflict(error);
    }
  }

  async findAllByPond(pondId: string, user?: User) {
    await this.findPond(pondId);
    if (user) await this.pondAccessService.ensureCanAccess(user, pondId);
    return this.cropSeasonRepository.find({
      where: { pondId },
      order: { stockingDate: 'DESC' },
    });
  }

  async findOne(id: string, user?: User) {
    const cropSeason = await this.cropSeasonRepository.findOne({
      where: { id },
      relations: { pond: true },
    });

    if (!cropSeason) {
      throw new NotFoundException(`Không tìm thấy vụ nuôi với id ${id}`);
    }
    if (user) await this.pondAccessService.ensureCanAccess(user, cropSeason.pondId);

    return cropSeason;
  }

  async update(id: string, updateDto: UpdateCropSeasonDto, user?: User) {
    const cropSeason = await this.findOne(id, user);

    if (updateDto.status === CropSeasonStatus.ACTIVE) {
      await this.ensureNoActiveSeason(cropSeason.pondId, updateDto.status, id);
    }
    if (updateDto.stockingDate) {
      this.validateStockingDate(updateDto.stockingDate);
    }

    Object.assign(cropSeason, {
      ...updateDto,
      name: updateDto.name?.trim() ?? cropSeason.name,
    });

    try {
      return await this.cropSeasonRepository.save(cropSeason);
    } catch (error) {
      this.throwActiveSeasonConflict(error);
    }
  }

  async remove(id: string, user?: User) {
    const cropSeason = await this.findOne(id, user);
    await this.cropSeasonRepository.remove(cropSeason);
    return { message: `Đã xoá vụ nuôi ${cropSeason.name}` };
  }

  async getStatistics(id: string, user?: User) {
    const cropSeason = await this.findOne(id, user);
    const stockingDateTime = new Date(`${cropSeason.stockingDate}T00:00:00Z`);

    const feedingRecords = await this.feedingRecordRepository
      .createQueryBuilder('record')
      .where('record.pond_id = :pondId', { pondId: cropSeason.pondId })
      .andWhere('record.started_at >= :stockingDate', { stockingDate: stockingDateTime })
      .getMany();

    const totalFeedKg = feedingRecords.reduce((sum, r) => {
      const amount = Number(r.actualAmountKg ?? r.requestedAmountKg ?? 0);
      return sum + amount;
    }, 0);

    const now = new Date();
    const durationDays = Math.max(
      1,
      Math.ceil((now.getTime() - stockingDateTime.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const initialWeightKg = ((Number(cropSeason.initialAverageWeightG) || 0.02) * Number(cropSeason.initialCount)) / 1000;
    const survivalRatePercent = Number(cropSeason.estimatedSurvivalRate) || 80;
    const estimatedSurvivingShrimp = Math.round((Number(cropSeason.initialCount) * survivalRatePercent) / 100);
    
    // Estimate current weight based on days of culture (e.g. 0.25g to 25g over 90 days)
    const estimatedCurrentWeightG = Math.min(30, (Number(cropSeason.initialAverageWeightG) || 0.02) + durationDays * 0.25);
    const estimatedCurrentBiomassKg = (estimatedSurvivingShrimp * estimatedCurrentWeightG) / 1000;
    const biomassGainKg = Math.max(1, estimatedCurrentBiomassKg - initialWeightKg);
    const fcr = totalFeedKg > 0 ? Number((totalFeedKg / biomassGainKg).toFixed(2)) : null;

    return {
      cropSeasonId: cropSeason.id,
      name: cropSeason.name,
      status: cropSeason.status,
      stockingDate: cropSeason.stockingDate,
      daysOfCulture: durationDays,
      initialCount: Number(cropSeason.initialCount),
      estimatedSurvivingCount: estimatedSurvivingShrimp,
      survivalRatePercent,
      totalFeedConsumedKg: Number(totalFeedKg.toFixed(2)),
      totalFeedingSessions: feedingRecords.length,
      estimatedCurrentBiomassKg: Number(estimatedCurrentBiomassKg.toFixed(2)),
      fcr,
    };
  }

  private async findPond(id: string) {
    const pond = await this.pondRepository.findOne({ where: { id } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${id}`);
    }
    return pond;
  }

  private async ensureNoActiveSeason(pondId: string, status?: CropSeasonStatus, excludedId?: string) {
    if (status !== CropSeasonStatus.ACTIVE) {
      return;
    }

    const activeSeason = await this.cropSeasonRepository.findOne({
      where: { pondId, status: CropSeasonStatus.ACTIVE },
    });

    if (activeSeason && activeSeason.id !== excludedId) {
      throw new BadRequestException('Mỗi ao chỉ được có một vụ nuôi đang hoạt động');
    }
  }

  private validateStockingDate(stockingDate: string) {
    const maximumDate = new Date();
    maximumDate.setFullYear(maximumDate.getFullYear() + 1);
    const parsedDate = new Date(`${stockingDate}T00:00:00Z`);

    if (parsedDate > maximumDate) {
      throw new BadRequestException('Ngày thả giống không được vượt quá một năm trong tương lai');
    }
  }

  private throwActiveSeasonConflict(error: unknown): never {
    if (error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
      throw new BadRequestException('Mỗi ao chỉ được có một vụ nuôi đang hoạt động');
    }
    throw error;
  }
}
