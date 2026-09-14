import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CropSeasonStatus } from '../../database/entities/enums';
import { CreateCropSeasonDto } from './dto/create-crop-season.dto';
import { UpdateCropSeasonDto } from './dto/update-crop-season.dto';

@Injectable()
export class CropSeasonService {
  constructor(
    @InjectRepository(CropSeason)
    private readonly cropSeasonRepository: Repository<CropSeason>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
  ) {}

  async create(pondId: string, createDto: CreateCropSeasonDto) {
    await this.findPond(pondId);
    await this.ensureNoActiveSeason(pondId, createDto.status);

    const cropSeason = this.cropSeasonRepository.create({
      ...createDto,
      pondId,
      name: createDto.name.trim(),
      status: createDto.status ?? CropSeasonStatus.PLANNED,
      initialAverageWeightG: createDto.initialAverageWeightG ?? null,
      estimatedSurvivalRate: createDto.estimatedSurvivalRate ?? null,
    });

    return this.cropSeasonRepository.save(cropSeason);
  }

  async findAllByPond(pondId: string) {
    await this.findPond(pondId);
    return this.cropSeasonRepository.find({
      where: { pondId },
      order: { stockingDate: 'DESC' },
    });
  }

  async findOne(id: string) {
    const cropSeason = await this.cropSeasonRepository.findOne({
      where: { id },
      relations: { pond: true },
    });

    if (!cropSeason) {
      throw new NotFoundException(`Không tìm thấy vụ nuôi với id ${id}`);
    }

    return cropSeason;
  }

  async update(id: string, updateDto: UpdateCropSeasonDto) {
    const cropSeason = await this.findOne(id);

    if (updateDto.status === CropSeasonStatus.ACTIVE) {
      await this.ensureNoActiveSeason(cropSeason.pondId, updateDto.status, id);
    }

    Object.assign(cropSeason, {
      ...updateDto,
      name: updateDto.name?.trim() ?? cropSeason.name,
    });

    return this.cropSeasonRepository.save(cropSeason);
  }

  async remove(id: string) {
    const cropSeason = await this.findOne(id);
    await this.cropSeasonRepository.remove(cropSeason);
    return { message: `Đã xoá vụ nuôi ${cropSeason.name}` };
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
}
