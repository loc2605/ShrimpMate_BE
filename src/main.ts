import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule, ObserveInstrument } from './app.module';
import { seedFarmPondData } from './database/seeds/farm-pond.seed';
import { seedCropSeasonData } from './database/seeds/crop-season.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  const dataSource = app.get(DataSource);
  await seedFarmPondData(dataSource);
  await seedCropSeasonData(dataSource);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
