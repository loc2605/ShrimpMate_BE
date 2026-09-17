import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../../database/entities/device.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AuthModule } from '../auth/auth.module';
import { FeedingController } from './feeding.controller';
import { FeedingService } from './feeding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedingSchedule, FeedingRecord, Pond, Device, CropSeason]),
    PassportModule,
    AuthModule,
  ],
  controllers: [FeedingController],
  providers: [FeedingService],
  exports: [FeedingService],
})
export class FeedingModule {}
