import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/entities/enums';
import { MqttService } from './mqtt.service';
import { MqttFeederCommandPayload } from './mqtt.types';

@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('status')
  getStatus() {
    return {
      connected: this.mqttService.getIsConnected(),
      message: this.mqttService.getIsConnected()
        ? 'Đã kết nối tới MQTT Broker'
        : 'Chưa kết nối tới MQTT Broker (đang thử lại)',
    };
  }

  @Post('devices/:deviceUid/feeder-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async testFeederCommand(
    @Param('deviceUid') deviceUid: string,
    @Body() payload: Partial<MqttFeederCommandPayload>,
  ) {
    const success = await this.mqttService.publishFeederCommand(deviceUid, {
      command: payload.command ?? 'FEED',
      feedAmountKg: payload.feedAmountKg ?? 1.0,
      spreadRateKgPerMinute: payload.spreadRateKgPerMinute ?? 1.0,
      durationSeconds: payload.durationSeconds ?? 60,
      timestamp: new Date().toISOString(),
    });

    return {
      success,
      deviceUid,
      message: success
        ? `Đã gửi lệnh feeder test tới thiết bị ${deviceUid}`
        : `Gửi lệnh test thất bại (broker chưa kết nối)`,
    };
  }
}
