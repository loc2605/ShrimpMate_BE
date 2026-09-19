import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserPondAssignment } from '../../database/entities/user-pond-assignment.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Farm } from '../../database/entities/farm.entity';
import { UserRole } from '../../database/entities/enums';

@Injectable()
export class PondAccessService {
  constructor(
    @InjectRepository(UserPondAssignment)
    private readonly assignmentRepository: Repository<UserPondAssignment>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
  ) {}

  async ensureCanAccess(user: User, pondId: string) {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role === UserRole.MANAGER) {
      const pond = await this.pondRepository.findOne({
        where: { id: pondId },
        relations: { farm: true },
      });
      if (pond?.farm && pond.farm.ownerId === user.id) {
        return;
      }
      const directAssignment = await this.assignmentRepository.findOne({
        where: { userId: user.id, pondId },
      });
      if (directAssignment) {
        return;
      }
      throw new ForbiddenException('Bạn không có quyền truy cập Pond này');
    }

    if (user.role === UserRole.OPERATOR) {
      const assignment = await this.assignmentRepository.findOne({
        where: { userId: user.id, pondId },
      });
      if (!assignment) {
        throw new ForbiddenException('Bạn không có quyền truy cập Pond này');
      }
    }
  }

  async findAssignedPondIds(user: User) {
    if (user.role === UserRole.ADMIN) {
      return null;
    }

    if (user.role === UserRole.MANAGER) {
      const ownedFarms = await this.farmRepository.find({
        where: { ownerId: user.id },
        select: { id: true },
      });
      const ownedFarmIds = ownedFarms.map((farm) => farm.id);

      let ownedPondIds: string[] = [];
      if (ownedFarmIds.length > 0) {
        const ownedPonds = await this.pondRepository.find({
          where: ownedFarmIds.map((farmId) => ({ farmId })),
          select: { id: true },
        });
        ownedPondIds = ownedPonds.map((pond) => pond.id);
      }

      const assignments = await this.assignmentRepository.find({
        where: { userId: user.id },
      });
      const assignedIds = assignments.map((assignment) => assignment.pondId);

      return Array.from(new Set([...ownedPondIds, ...assignedIds]));
    }

    if (user.role === UserRole.OPERATOR) {
      const assignments = await this.assignmentRepository.find({
        where: { userId: user.id },
      });
      return assignments.map((assignment) => assignment.pondId);
    }

    return null;
  }
}
