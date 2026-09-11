import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiIntegrationModule } from './modules/ai-integration/ai-integration.module';
import { SafetyRuleModule } from './modules/safety-rule/safety-rule.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DevicesController } from './modules/devices/devices.controller';
import { DevicesService } from './modules/devices/devices.service';
import { FeedingController } from './modules/feeding/feeding.controller';
import { FeedingService } from './modules/feeding/feeding.service';
import { TelemetryController } from './modules/telemetry/telemetry.controller';
import { TelemetryService } from './modules/telemetry/telemetry.service';
import { MqttController } from './mqtt/mqtt.controller';
import { MqttService } from './mqtt/mqtt.service';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'shrimpmate-backend',
    }),
    AiIntegrationModule,
    SafetyRuleModule,
    AlertsModule,
    NotificationsModule,
  ],
  controllers: [AppController, DevicesController, FeedingController, TelemetryController, MqttController],
  providers: [AppService, DevicesService, FeedingService, TelemetryService, MqttService],
})
export class AppModule {}
