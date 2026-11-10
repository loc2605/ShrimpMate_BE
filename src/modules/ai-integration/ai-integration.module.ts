import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiRecommendation } from '../../database/entities/ai-recommendation.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { SafetyRuleModule } from '../safety-rule/safety-rule.module';
import { AiIntegrationController } from './ai-integration.controller';
import { AiIntegrationService } from './ai-integration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiRecommendation,
      Pond,
      CropSeason,
      TelemetryReading,
      FeedingRecord,
    ]),
    PondAccessModule,
    SafetyRuleModule,
  ],
  controllers: [AiIntegrationController],
  providers: [AiIntegrationService],
  exports: [AiIntegrationService],
})
export class AiIntegrationModule {}
