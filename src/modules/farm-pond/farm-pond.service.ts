import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FarmStatus, PondStatus } from '../../database/entities/enums';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreatePondDto } from './dto/create-pond.dto';

@Injectable()
export class FarmPondService {
  constructor(
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
  ) {}

  async createFarm(createFarmDto: CreateFarmDto) {
    const farm = this.farmRepository.create({
      ...createFarmDto,
      status: createFarmDto.status ?? FarmStatus.ACTIVE,
    });

    return this.farmRepository.save(farm);
  }

  async findAllFarms() {
    return this.farmRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findFarmById(id: string) {
    const farm = await this.farmRepository.findOne({ where: { id } });
    if (!farm) {
      throw new NotFoundException(`Không tìm thấy trang trại với id ${id}`);
    }
    return farm;
  }

  async updateFarm(id: string, updateFarmDto: UpdateFarmDto) {
    const farm = await this.findFarmById(id);
    Object.assign(farm, updateFarmDto);
    return this.farmRepository.save(farm);
  }

  async removeFarm(id: string) {
    const farm = await this.findFarmById(id);
    await this.farmRepository.remove(farm);
    return { message: `Đã xoá trang trại ${farm.name}` };
  }

  async createPond(farmId: string, createPondDto: CreatePondDto) {
    const farm = await this.findFarmById(farmId);

    const existingPond = await this.pondRepository.findOne({
      where: { farmId, code: createPondDto.code.trim() },
    });

    if (existingPond) {
      throw new BadRequestException(`Mã ao ${createPondDto.code} đã tồn tại trong trang trại này`);
    }

    const pond = this.pondRepository.create({
      ...createPondDto,
      farmId: farm.id,
      code: createPondDto.code.trim(),
      name: createPondDto.name.trim(),
      status: createPondDto.status ?? PondStatus.ACTIVE,
    });

    return this.pondRepository.save(pond);
  }

  async findAllPondsByFarm(farmId: string) {
    await this.findFarmById(farmId);

    return this.pondRepository.find({
      where: { farmId },
      order: { code: 'ASC' },
    });
  }

  async findPondById(id: string) {
    const pond = await this.pondRepository.findOne({
      where: { id },
      relations: { farm: true },
    });

    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${id}`);
    }

    return pond;
  }

  async updatePond(id: string, updateData: Partial<CreatePondDto>) {
    const pond = await this.findPondById(id);

    if (updateData.code && updateData.code.trim() !== pond.code) {
      const existing = await this.pondRepository.findOne({
        where: { farmId: pond.farmId, code: updateData.code.trim() },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`Mã ao ${updateData.code} đã tồn tại trong trang trại này`);
      }
    }

    Object.assign(pond, {
      ...updateData,
      code: updateData.code?.trim() ?? pond.code,
      name: updateData.name?.trim() ?? pond.name,
    });

    return this.pondRepository.save(pond);
  }

  async removePond(id: string) {
    const pond = await this.findPondById(id);
    await this.pondRepository.remove(pond);
    return { message: `Đã xoá ao ${pond.name}` };
  }
}
