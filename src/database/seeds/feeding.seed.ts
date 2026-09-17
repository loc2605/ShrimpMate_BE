import { DataSource } from 'typeorm';
import { FeedingSchedule } from '../entities/feeding-schedule.entity';
import { Pond } from '../entities/pond.entity';

export async function seedFeedingData(dataSource: DataSource) {
  const scheduleRepository = dataSource.getRepository(FeedingSchedule);
  const pondRepository = dataSource.getRepository(Pond);

  if ((await scheduleRepository.count()) > 0) {
    return;
  }

  const ponds = await pondRepository.find({ order: { code: 'ASC' }, take: 2 });
  if (ponds.length < 2) {
    return;
  }

  const schedules = await scheduleRepository.save([
    {
      pondId: ponds[0].id,
      name: 'Lịch cho ăn sáng Ao 1',
      timeOfDay: '08:00:00',
      feedAmountKg: 12.5,
      spreadRateKgPerMinute: 1.25,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      isEnabled: true,
    },
    {
      pondId: ponds[0].id,
      name: 'Lịch cho ăn chiều Ao 1',
      timeOfDay: '17:30:00',
      feedAmountKg: 15,
      spreadRateKgPerMinute: 1.5,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      isEnabled: true,
    },
    {
      pondId: ponds[1].id,
      name: 'Lịch cho ăn sáng Ao 2',
      timeOfDay: '07:30:00',
      feedAmountKg: 10,
      spreadRateKgPerMinute: 1,
      daysOfWeek: [1, 3, 5],
      isEnabled: true,
    },
  ]);

  return { schedules };
}
