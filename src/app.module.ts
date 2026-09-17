import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { createObserveModule } from '@nestjs/observe';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiIntegrationModule } from './modules/ai-integration/ai-integration.module';
import { SafetyRuleModule } from './modules/safety-rule/safety-rule.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DevicesModule } from './modules/devices/devices.module';
import { TelemetryController } from './modules/telemetry/telemetry.controller';
import { TelemetryService } from './modules/telemetry/telemetry.service';
import { MqttController } from './mqtt/mqtt.controller';
import { MqttService } from './mqtt/mqtt.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { FarmPondModule } from './modules/farm-pond/farm-pond.module';
import { CropSeasonModule } from './modules/crop-season/crop-season.module';
import { FeedingModule } from './modules/feeding/feeding.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).optional(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().port().default(6379),
        MQTT_BROKER_URL: Joi.string().uri({ scheme: ['mqtt', 'mqtts'] }).default('mqtt://localhost:1883'),
        AI_ENGINE_URL: Joi.string().uri().optional(),
      }),
    }),
    DatabaseModule,
    AuthModule,
    FarmPondModule,
    CropSeasonModule,
    DevicesModule,
    FeedingModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'P5MSz2SaFTqqq8lh',
      appSecret: 'PBoE%lIdblmbvSFwibHHWhT7!4Whh%pM6g6ApWjxcKvEk',
      serviceId: 'shrimpmate-backend',
    }),
    AiIntegrationModule,
    SafetyRuleModule,
    AlertsModule,
    NotificationsModule,
  ],
  controllers: [AppController, TelemetryController, MqttController],
  providers: [AppService, TelemetryService, MqttService],
})
export class AppModule {}
