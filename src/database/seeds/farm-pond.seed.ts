import { DataSource } from 'typeorm';
import { Farm } from '../entities/farm.entity';
import { Pond } from '../entities/pond.entity';
import { User } from '../entities/user.entity';
import { FarmStatus, PondStatus, UserRole } from '../entities/enums';

export async function seedFarmPondData(dataSource: DataSource) {
  const farmRepository = dataSource.getRepository(Farm);
  const pondRepository = dataSource.getRepository(Pond);
  const userRepository = dataSource.getRepository(User);

  const farmerUser =
    (await userRepository.findOne({
      where: { email: process.env.SEED_FARMER_EMAIL ?? 'farmer@shrimpmate.local' },
    })) ??
    (await userRepository.findOne({
      where: { role: UserRole.FARMER },
    }));

  const count = await farmRepository.count();
  if (count > 0) {
    if (farmerUser) {
      await farmRepository
        .createQueryBuilder()
        .update(Farm)
        .set({ ownerId: farmerUser.id })
        .where('owner_id IS NULL OR name IN (:...seedFarmNames)', {
          seedFarmNames: ['Trang trại Sóng Xanh', 'Ao Nước Trong', 'Vườn Tôm Minh Phú', 'Trang trai Tom Hung Phat'],
        })
        .execute();
    }
    return;
  }

  const farms = await farmRepository.save([
    {
      name: 'Trang trại Sóng Xanh',
      address: 'Bạc Liêu, Việt Nam',
      status: FarmStatus.ACTIVE,
      ownerId: farmerUser?.id ?? null,
    },
    {
      name: 'Ao Nước Trong',
      address: 'Cà Mau, Việt Nam',
      status: FarmStatus.ACTIVE,
      ownerId: farmerUser?.id ?? null,
    },
    {
      name: 'Vườn Tôm Minh Phú',  
      address: 'Sóc Trăng, Việt Nam',
      status: FarmStatus.INACTIVE,
      ownerId: null,
    },
  ]);

  await pondRepository.save([
    {
      farmId: farms[0].id,
      code: 'POND-01',
      name: 'Ao 1 - Giai đoạn tăng trưởng',
      areaM2: 3200,
      status: PondStatus.ACTIVE,
    },
    {
      farmId: farms[0].id,
      code: 'POND-02',
      name: 'Ao 2 - Giai đoạn nuôi thương phẩm',
      areaM2: 2800,
      status: PondStatus.ACTIVE,
    },
    {
      farmId: farms[1].id,
      code: 'POND-03',
      name: 'Ao 3 - Bảo dưỡng',
      areaM2: 1900,
      status: PondStatus.MAINTENANCE,
    },
    {
      farmId: farms[1].id,
      code: 'POND-04',
      name: 'Ao 4 - Nuôi thử nghiệm',
      areaM2: 2400,
      status: PondStatus.ACTIVE,
    },
  ]);

  return { farms, ponds: 4 };
}
