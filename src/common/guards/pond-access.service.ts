import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Farm } from '../../database/entities/farm.entity';
import { UserRole } from '../../database/entities/enums';

@Injectable()
export class PondAccessService {
  constructor(
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
  ) {}

  async ensureCanAccess(user: User, pondId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.FARMER) {
      const pond = await this.pondRepository.findOne({
        where: { id: pondId },
        relations: { farm: true },
      });
      if (pond?.farm && pond.farm.ownerId === user.id) {
        return;
      }
      throw new ForbiddenException('Bạn không có quyền truy cập Pond này');
    }

    throw new ForbiddenException('Bạn không có quyền truy cập Pond này');
  }

  async findAssignedPondIds(user: User): Promise<string[] | null> {
    if (user.role === UserRole.ADMIN) {
      return null;
    }

    if (user.role === UserRole.FARMER) {
      const ownedFarms = await this.farmRepository.find({
        where: { ownerId: user.id },
        select: { id: true },
      });
      const ownedFarmIds = ownedFarms.map((farm) => farm.id);

      if (ownedFarmIds.length === 0) {
        return [];
      }

      const ownedPonds = await this.pondRepository.find({
        where: ownedFarmIds.map((farmId) => ({ farmId })),
        select: { id: true },
      });
      return ownedPonds.map((pond) => pond.id);
    }

    return [];
  }
}

