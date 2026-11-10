import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../../database/entities/alert.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AiRecommendation } from '../../database/entities/ai-recommendation.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertCooldownService } from './alert-cooldown.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Pond, AiRecommendation]),
    PondAccessModule,
    NotificationsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertCooldownService],
  exports: [AlertsService, AlertCooldownService],
})
export class AlertsModule {}
