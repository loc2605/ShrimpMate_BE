import { DataSource } from 'typeorm';
import { Farm } from '../entities/farm.entity';
import { Pond } from '../entities/pond.entity';
import { FarmStatus, PondStatus } from '../entities/enums';

export async function seedFarmPondData(dataSource: DataSource) {
  const farmRepository = dataSource.getRepository(Farm);
  const pondRepository = dataSource.getRepository(Pond);

  const count = await farmRepository.count();
  if (count > 0) {
    return;
  }

  const farms = await farmRepository.save([
    {
      name: 'Trang trại Sóng Xanh',
      address: 'Bạc Liêu, Việt Nam',
      status: FarmStatus.ACTIVE,
    },
    {
      name: 'Ao Nước Trong',
      address: 'Cà Mau, Việt Nam',
      status: FarmStatus.ACTIVE,
    },
    {
      name: 'Vườn Tôm Minh Phú',
      address: 'Sóc Trăng, Việt Nam',
      status: FarmStatus.INACTIVE,
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
