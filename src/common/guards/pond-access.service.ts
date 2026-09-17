import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserPondAssignment } from '../../database/entities/user-pond-assignment.entity';
import { UserRole } from '../../database/entities/enums';

@Injectable()
export class PondAccessService {
  constructor(
    @InjectRepository(UserPondAssignment)
    private readonly assignmentRepository: Repository<UserPondAssignment>,
  ) {}

  async ensureCanAccess(user: User, pondId: string) {
    if (![UserRole.OPERATOR, UserRole.MANAGER].includes(user.role)) {
      return;
    }
    const assignment = await this.assignmentRepository.findOne({ where: { userId: user.id, pondId } });
    if (!assignment) {
      throw new ForbiddenException('Bạn không có quyền truy cập Pond này');
    }
  }

  async findAssignedPondIds(user: User) {
    if (![UserRole.OPERATOR, UserRole.MANAGER].includes(user.role)) {
      return null;
    }
    const assignments = await this.assignmentRepository.find({ where: { userId: user.id } });
    return assignments.map((assignment) => assignment.pondId);
  }
}
