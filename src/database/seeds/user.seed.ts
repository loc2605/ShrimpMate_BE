import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/enums';

const defaultUsers = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@shrimpmate.local',
    phoneNumber: process.env.SEED_ADMIN_PHONE ?? '0901000001',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456',
    fullName: 'ShrimpMate Admin',
    role: UserRole.ADMIN,
  },
  {
    email: process.env.SEED_FARMER_EMAIL ?? 'farmer@shrimpmate.local',
    phoneNumber: process.env.SEED_FARMER_PHONE ?? '0901000002',
    password: process.env.SEED_FARMER_PASSWORD ?? 'Farmer@123456',
    fullName: 'ShrimpMate Farmer',
    role: UserRole.FARMER,
  },
];

if (process.env.NODE_ENV === 'production') {
  const hasDefaultPassword = defaultUsers.some((user) =>
    ['Admin@123456', 'Farmer@123456'].includes(user.password),
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
    const existingUser = await userRepository.findOne({
      where: [{ email }, { phoneNumber: seedUser.phoneNumber }],
    });

    if (existingUser) {
      let updated = false;
      if (existingUser.email !== email && ['manager@shrimpmate.local', 'operator@shrimpmate.local'].includes(existingUser.email)) {
        existingUser.email = email;
        existingUser.fullName = seedUser.fullName;
        existingUser.passwordHash = await bcrypt.hash(seedUser.password, 12);
        updated = true;
      }
      if (['admin@shrimpmate.local', 'farmer@shrimpmate.local'].includes(existingUser.email)) {
        const passwordMatches = await bcrypt.compare(seedUser.password, existingUser.passwordHash);
        if (!passwordMatches) {
          existingUser.passwordHash = await bcrypt.hash(seedUser.password, 12);
          updated = true;
        }
      }
      if (!existingUser.phoneNumber && seedUser.phoneNumber) {
        existingUser.phoneNumber = seedUser.phoneNumber;
        updated = true;
      }
      if (existingUser.role !== seedUser.role) {
        existingUser.role = seedUser.role;
        updated = true;
      }
      if (updated) {
        await userRepository.save(existingUser);
      }
      continue;
    }

    const passwordHash = await bcrypt.hash(seedUser.password, 12);
    users.push(
      await userRepository.save(
        userRepository.create({
          email,
          phoneNumber: seedUser.phoneNumber,
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
