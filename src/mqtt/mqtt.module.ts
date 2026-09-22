import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../database/entities/device.entity';
import { FeedingRecord } from '../database/entities/feeding-record.entity';
import { TelemetryModule } from '../modules/telemetry/telemetry.module';
import { MqttController } from './mqtt.controller';
import { MqttService } from './mqtt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, FeedingRecord]),
    TelemetryModule,
  ],
  controllers: [MqttController],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
