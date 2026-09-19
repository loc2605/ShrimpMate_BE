import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelemetryReading, Pond]),
    PondAccessModule,
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
