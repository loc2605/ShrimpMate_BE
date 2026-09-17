import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Pond } from '../entities/pond.entity';
import { UserPondAssignment } from '../entities/user-pond-assignment.entity';
import { UserRole } from '../entities/enums';

export async function seedUserPondAssignments(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const pondRepository = dataSource.getRepository(Pond);
  const assignmentRepository = dataSource.getRepository(UserPondAssignment);
  const operator = await userRepository.findOne({ where: { role: UserRole.OPERATOR } });
  const ponds = await pondRepository.find({ order: { code: 'ASC' }, take: 2 });

  if (!operator || ponds.length === 0) return;

  for (const pond of ponds) {
    const existing = await assignmentRepository.findOne({ where: { userId: operator.id, pondId: pond.id } });
    if (!existing) {
      await assignmentRepository.save(assignmentRepository.create({ userId: operator.id, pondId: pond.id }));
    }
  }
}
