import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Pond } from '../entities/pond.entity';
import { UserPondAssignment } from '../entities/user-pond-assignment.entity';
import { UserRole } from '../entities/enums';

export async function seedUserPondAssignments(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const pondRepository = dataSource.getRepository(Pond);
  const assignmentRepository = dataSource.getRepository(UserPondAssignment);
  const users = await userRepository.find({ where: [{ role: UserRole.OPERATOR }, { role: UserRole.MANAGER }] });
  const ponds = await pondRepository.find({ order: { code: 'ASC' }, take: 2 });

  if (users.length === 0 || ponds.length === 0) return;

  for (const user of users) {
    for (const pond of ponds) {
      const existing = await assignmentRepository.findOne({ where: { userId: user.id, pondId: pond.id } });
      if (!existing) {
        await assignmentRepository.save(assignmentRepository.create({ userId: user.id, pondId: pond.id }));
      }
    }
  }
}
