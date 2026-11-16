import { DataSource } from 'typeorm';
import { Farm } from '../entities/farm.entity';
import { Pond } from '../entities/pond.entity';
import { User } from '../entities/user.entity';
import { FarmerAssignment } from '../entities/farmer-assignment.entity';
import { FarmStatus, PondStatus, UserRole } from '../entities/enums';

export async function seedFarmPondData(dataSource: DataSource) {
  const farmRepository = dataSource.getRepository(Farm);
  const pondRepository = dataSource.getRepository(Pond);
  const userRepository = dataSource.getRepository(User);
  const assignmentRepository = dataSource.getRepository(FarmerAssignment);

  const managerUser =
    (await userRepository.findOne({
      where: { email: process.env.SEED_MANAGER_EMAIL ?? 'manager@shrimpmate.local' },
    })) ??
    (await userRepository.findOne({
      where: { role: UserRole.MANAGER },
    }));

  const farmerUser =
    (await userRepository.findOne({
      where: { email: process.env.SEED_FARMER_EMAIL ?? 'farmer@shrimpmate.local' },
    })) ??
    (await userRepository.findOne({
      where: { role: UserRole.FARMER },
    }));

  const count = await farmRepository.count();
  if (count > 0) {
    if (managerUser) {
      await farmRepository
        .createQueryBuilder()
        .update(Farm)
        .set({ ownerId: managerUser.id })
        .where('owner_id IS NULL OR name IN (:...seedFarmNames)', {
          seedFarmNames: ['Trang trại Sóng Xanh', 'Ao Nước Trong', 'Vườn Tôm Minh Phú', 'Trang trai Tom Hung Phat'],
        })
        .execute();
    }

    // Đảm bảo Farmer có phân công mẫu
    if (farmerUser) {
      const existingAssignment = await assignmentRepository.findOne({ where: { farmerId: farmerUser.id } });
      if (!existingAssignment) {
        const firstFarm = await farmRepository.findOne({ where: { name: 'Trang trại Sóng Xanh' } });
        if (firstFarm) {
          const firstPond = await pondRepository.findOne({ where: { farmId: firstFarm.id } });
          await assignmentRepository.save(
            assignmentRepository.create({
              farmerId: farmerUser.id,
              farmId: firstFarm.id,
              pondId: firstPond?.id ?? null,
            }),
          );
        }
      }
    }
    return;
  }

  const farms = await farmRepository.save([
    {
      id: '788b3aaf-8235-45fb-8214-abe3aaed2bb5',
      name: 'Trang trại Sóng Xanh',
      address: 'Bạc Liêu, Việt Nam',
      status: FarmStatus.ACTIVE,
      ownerId: managerUser?.id ?? null,
    },
    {
      id: 'f2eb0d82-d932-4d07-a508-14f9653ba022',
      name: 'Trang trại Cà Mau Eco-Shrimp',
      address: 'Cà Mau, Việt Nam',
      status: FarmStatus.ACTIVE,
      ownerId: managerUser?.id ?? null,
    },
  ]);

  const ponds = await pondRepository.save([
    {
      id: '208cf3b7-a60f-4c83-83b0-54d06fee3d97',
      farmId: farms[0].id,
      code: 'POND-01',
      name: 'Ao 1 - Giai đoạn tăng trưởng',
      areaM2: 3200,
      status: PondStatus.ACTIVE,
    },
    {
      id: '9449a7a5-4c28-4b18-aabb-ff0171116a74',
      farmId: farms[0].id,
      code: 'POND-02',
      name: 'Ao 2 - Giai đoạn nuôi thương phẩm',
      areaM2: 2800,
      status: PondStatus.ACTIVE,
    },
    {
      id: '7466260a-ff2b-4e3c-870b-2b8f1a6a82bc',
      farmId: farms[1].id,
      code: 'POND-03',
      name: 'Ao 3 - Ương giống công nghệ cao',
      areaM2: 2000,
      status: PondStatus.ACTIVE,
    },
    {
      id: '624bbafc-1caa-4a5f-a345-26cc29ed8466',
      farmId: farms[1].id,
      code: 'POND-04',
      name: 'Ao 4 - Nuôi tuần hoàn RAS',
      areaM2: 2500,
      status: PondStatus.ACTIVE,
    },
  ]);

  // Phân công mẫu cho farmerUser vào Ao 1
  if (farmerUser && farms[0] && ponds[0]) {
    await assignmentRepository.save(
      assignmentRepository.create({
        farmerId: farmerUser.id,
        farmId: farms[0].id,
        pondId: ponds[0].id,
      }),
    );
  }

  return { farms, ponds: 4 };
}
