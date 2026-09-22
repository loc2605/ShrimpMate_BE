import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Alert } from '../../database/entities/alert.entity';
import { Device } from '../../database/entities/device.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryThresholdService } from './telemetry-threshold.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelemetryReading, Pond, Alert, Device]),
    PondAccessModule,
    AlertsModule,
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService, TelemetryThresholdService],
  exports: [TelemetryService, TelemetryThresholdService],
})
export class TelemetryModule {}
