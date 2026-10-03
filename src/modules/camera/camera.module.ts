import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraFisLog } from '../../database/entities/camera-fis-log.entity';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';
import { CameraAiEngineService } from './camera-ai-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CameraFisLog,
      Device,
      Pond,
      FeedingRecord,
    ]),
    PondAccessModule,
    AlertsModule,
  ],
  controllers: [CameraController],
  providers: [CameraService, CameraAiEngineService],
  exports: [CameraService, CameraAiEngineService],
})
export class CameraModule {}
