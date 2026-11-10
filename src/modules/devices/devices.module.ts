import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { MqttModule } from '../../mqtt/mqtt.module';
import { AlertsModule } from '../alerts/alerts.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceHealthService } from './device-health.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, Pond]),
    PondAccessModule,
    MqttModule,
    AlertsModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService, DeviceHealthService],
  exports: [DevicesService, DeviceHealthService],
})
export class DevicesModule {}
