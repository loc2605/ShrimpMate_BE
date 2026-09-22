import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../../database/entities/device.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { FeedingSchedule } from '../../database/entities/feeding-schedule.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { SafetyRuleModule } from '../safety-rule/safety-rule.module';
import { MqttModule } from '../../mqtt/mqtt.module';
import { AlertsModule } from '../alerts/alerts.module';
import { FeedingController } from './feeding.controller';
import { FeedingService } from './feeding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedingSchedule, FeedingRecord, Pond, Device, CropSeason]),
    PondAccessModule,
    SafetyRuleModule,
    MqttModule,
    AlertsModule,
  ],
  controllers: [FeedingController],
  providers: [FeedingService],
  exports: [FeedingService],
})
export class FeedingModule {}
