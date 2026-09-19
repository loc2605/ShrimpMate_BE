import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FarmStatus, PondStatus, UserRole } from '../../database/entities/enums';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreatePondDto } from './dto/create-pond.dto';
import { PaginationDto } from './dto/pagination.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';

@Injectable()
export class FarmPondService {
  constructor(
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    private readonly pondAccessService: PondAccessService,
  ) {}

  async createFarm(createFarmDto: CreateFarmDto, user?: User) {
    const farm = this.farmRepository.create({
      ...createFarmDto,
      name: createFarmDto.name.trim(),
      address: createFarmDto.address?.trim() || null,
      status: createFarmDto.status ?? FarmStatus.ACTIVE,
      ownerId: user?.id ?? null,
    });

    return this.farmRepository.save(farm);
  }

  async findAllFarms({ page = 1, limit = 20 }: PaginationDto = new PaginationDto(), user?: User) {
    const farmQuery = this.farmRepository
      .createQueryBuilder('farm')
      .orderBy('farm.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (user) {
      if (user.role === UserRole.FARMER) {
        farmQuery.andWhere('farm.owner_id = :ownerId', { ownerId: user.id });
      }
    }

    const [data, total] = await farmQuery.getManyAndCount();
    return { data, meta: { page, limit, total, pageCount: Math.ceil(total / limit) } };
  }

  async findFarmById(id: string, user?: User) {
    const farm = await this.farmRepository.findOne({ where: { id } });
    if (!farm) {
      throw new NotFoundException(`Không tìm thấy trang trại với id ${id}`);
    }
    if (user && user.role === UserRole.FARMER && farm.ownerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập Farm này');
    }
    return farm;
  }

  async updateFarm(id: string, updateFarmDto: UpdateFarmDto, user?: User) {
    const farm = await this.findFarmById(id, user);
    Object.assign(farm, {
      ...updateFarmDto,
      name: updateFarmDto.name?.trim() ?? farm.name,
      address: updateFarmDto.address !== undefined ? updateFarmDto.address.trim() || null : farm.address,
    });
    return this.farmRepository.save(farm);
  }

  async removeFarm(id: string, user?: User) {
    const farm = await this.findFarmById(id, user);
    const ponds = await this.pondRepository.find({ where: { farmId: farm.id } });
    if (ponds.length > 0) {
      await this.pondRepository.softRemove(ponds);
    }
    await this.farmRepository.softRemove(farm);
    return { message: `Đã xoá trang trại ${farm.name}` };
  }

  async createPond(farmId: string, createPondDto: CreatePondDto, user?: User) {
    const farm = await this.findFarmById(farmId, user);

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

  async findAllPondsByFarm(farmId: string, { page = 1, limit = 20 }: PaginationDto = new PaginationDto(), user?: User) {
    await this.findFarmById(farmId, user);

    const query = this.pondRepository
      .createQueryBuilder('pond')
      .where('pond.farm_id = :farmId', { farmId })
      .orderBy('pond.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, meta: { page, limit, total, pageCount: Math.ceil(total / limit) } };
  }

  async findPondById(id: string, user?: User) {
    const pond = await this.pondRepository.findOne({
      where: { id },
      relations: { farm: true },
    });

    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${id}`);
    }
    if (user) {
      await this.pondAccessService.ensureCanAccess(user, id);
    }

    return pond;
  }

  async updatePond(id: string, updateData: UpdatePondDto, user?: User) {
    const pond = await this.findPondById(id, user);

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

  async removePond(id: string, user?: User) {
    const pond = await this.findPondById(id, user);
    await this.pondRepository.softRemove(pond);
    return { message: `Đã xoá ao ${pond.name}` };
  }
}
