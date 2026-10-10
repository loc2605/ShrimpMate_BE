import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Farm } from '../../database/entities/farm.entity';
import { FarmerAssignment } from '../../database/entities/farmer-assignment.entity';
import { UserRole } from '../../database/entities/enums';

@Injectable()
export class PondAccessService {
  constructor(
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(FarmerAssignment)
    private readonly assignmentRepository: Repository<FarmerAssignment>,
  ) {}

  async ensureCanAccess(user: User, pondId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    const pond = await this.pondRepository.findOne({
      where: { id: pondId },
      relations: { farm: true },
    });

    if (!pond) {
      throw new ForbiddenException('Không tìm thấy ao nuôi');
    }

    // Manager: sở hữu trang trại chứa ao nuôi
    if (user.role === UserRole.MANAGER) {
      if (pond.farm && pond.farm.ownerId === user.id) {
        return;
      }
      throw new ForbiddenException('Bạn không phải chủ sở hữu của trang trại chứa ao này');
    }

    // Farmer: được phân công ao nuôi hoặc toàn bộ trang trại
    if (user.role === UserRole.FARMER) {
      const assignment = await this.assignmentRepository.findOne({
        where: [
          { farmerId: user.id, pondId: pond.id },
          { farmerId: user.id, farmId: pond.farmId, pondId: null as any },
        ],
      });
      if (assignment) {
        return;
      }
      throw new ForbiddenException('Bạn chưa được phân công phụ trách ao nuôi này');
    }

    throw new ForbiddenException('Bạn không có quyền truy cập ao nuôi này');
  }

  async findAssignedPondIds(user: User): Promise<string[] | null> {
    if (user.role === UserRole.ADMIN) {
      return null;
    }

    // Manager: xem tất cả ao thuộc các trang trại mình sở hữu
    if (user.role === UserRole.MANAGER) {
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

    // Farmer: lấy danh sách ao được phân công
    if (user.role === UserRole.FARMER) {
      const assignments = await this.assignmentRepository.find({
        where: { farmerId: user.id },
      });

      if (assignments.length === 0) {
        return [];
      }

      const pondIdsSet = new Set<string>();

      for (const a of assignments) {
        if (a.pondId) {
          pondIdsSet.add(a.pondId);
        }
      }

      const wholeFarmIds = assignments.filter((a) => !a.pondId).map((a) => a.farmId);
      if (wholeFarmIds.length > 0) {
        const wholeFarmPonds = await this.pondRepository.find({
          where: wholeFarmIds.map((farmId) => ({ farmId })),
          select: { id: true },
        });
        for (const p of wholeFarmPonds) {
          pondIdsSet.add(p.id);
        }
      }

      return Array.from(pondIdsSet);
    }

    return [];
  }
}

