import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule, ObserveInstrument } from './app.module';
import { seedFarmPondData } from './database/seeds/farm-pond.seed';
import { seedCropSeasonData } from './database/seeds/crop-season.seed';
import { seedDeviceData } from './database/seeds/device.seed';
import { seedFeedingData } from './database/seeds/feeding.seed';
import { seedUserData } from './database/seeds/user.seed';
import { seedUserPondAssignments } from './database/seeds/user-pond-assignment.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const dataSource = app.get(DataSource);
  if (process.env.NODE_ENV !== 'production') {
    await seedUserData(dataSource);
  }
  await seedFarmPondData(dataSource);
  await seedCropSeasonData(dataSource);
  await seedDeviceData(dataSource);
  await seedFeedingData(dataSource);
  await seedUserPondAssignments(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
