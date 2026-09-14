import { DataSource } from 'typeorm';
import { CropSeason } from '../entities/crop-season.entity';
import { Pond } from '../entities/pond.entity';
import { CropSeasonStatus } from '../entities/enums';

export async function seedCropSeasonData(dataSource: DataSource) {
  const cropSeasonRepository = dataSource.getRepository(CropSeason);
  const pondRepository = dataSource.getRepository(Pond);

  if ((await cropSeasonRepository.count()) > 0) {
    return;
  }

  const ponds = await pondRepository.find({ order: { code: 'ASC' }, take: 2 });
  if (ponds.length < 2) {
    return;
  }

  const seasons = await cropSeasonRepository.save([
    {
      pondId: ponds[0].id,
      name: 'Vụ tôm thẻ chân trắng 2026 - Đợt 1',
      stockingDate: '2026-08-15',
      initialCount: 180000,
      stockingDensity: 56.25,
      initialAverageWeightG: 0.02,
      estimatedSurvivalRate: 85,
      status: CropSeasonStatus.ACTIVE,
    },
    {
      pondId: ponds[1].id,
      name: 'Vụ tôm thẻ chân trắng 2026 - Đợt 2',
      stockingDate: '2026-09-01',
      initialCount: 150000,
      stockingDensity: 53.57,
      initialAverageWeightG: 0.02,
      estimatedSurvivalRate: 88,
      status: CropSeasonStatus.PLANNED,
    },
  ]);

  return { seasons };
}
