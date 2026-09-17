import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/enums';

const defaultUsers = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@shrimpmate.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456',
    fullName: 'ShrimpMate Admin',
    role: UserRole.ADMIN,
  },
  {
    email: process.env.SEED_MANAGER_EMAIL ?? 'manager@shrimpmate.local',
    password: process.env.SEED_MANAGER_PASSWORD ?? 'Manager@123456',
    fullName: 'ShrimpMate Manager',
    role: UserRole.MANAGER,
  },
];

if (process.env.NODE_ENV === 'production') {
  const hasDefaultPassword = defaultUsers.some((user) =>
    ['Admin@123456', 'Manager@123456'].includes(user.password),
  );
  if (hasDefaultPassword) {
    console.warn('WARNING: production is using a default seed password. Set SEED_*_PASSWORD before deployment.');
  }
}

export async function seedUserData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const users = [];

  for (const seedUser of defaultUsers) {
    const email = seedUser.email.trim().toLowerCase();
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      continue;
    }

    const passwordHash = await bcrypt.hash(seedUser.password, 12);
    users.push(
      await userRepository.save(
        userRepository.create({
          email,
          passwordHash,
          fullName: seedUser.fullName,
          role: seedUser.role,
          isActive: true,
        }),
      ),
    );
  }

  return { users };
}