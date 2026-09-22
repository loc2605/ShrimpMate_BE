import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Device } from '../database/entities/device.entity';
import { FeedingRecord } from '../database/entities/feeding-record.entity';
import { DeviceStatus, FeedingStatus } from '../database/entities/enums';
import { TelemetryService } from '../modules/telemetry/telemetry.service';
import {
  MQTT_TOPICS,
  MqttFeederCommandPayload,
  MqttFeederStatusPayload,
  MqttHeartbeatPayload,
  MqttTelemetryPayload,
} from './mqtt.types';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly telemetryService: TelemetryService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(FeedingRecord)
    private readonly feedingRecordRepository: Repository<FeedingRecord>,
  ) {}

  onModuleInit() {
    this.connectBroker();
  }

  onModuleDestroy() {
    if (this.client) {
      this.logger.log('Đang đóng kết nối MQTT client...');
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  private connectBroker() {
    const brokerUrl = this.configService.get<string>('mqtt.brokerUrl', 'mqtt://localhost:1883');
    this.logger.log(`Đang khởi tạo kết nối MQTT Broker tại ${brokerUrl}...`);

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `shrimpmate_backend_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`[MQTT] Đã kết nối thành công tới MQTT Broker: ${brokerUrl}`);
        this.subscribeTopics();
      });

      this.client.on('message', (topic, payload) => {
        this.handleIncomingMessage(topic, payload);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`[MQTT] Lỗi kết nối Broker: ${err.message}. Backend vẫn hoạt động và sẽ tự động thử lại.`);
      });

      this.client.on('offline', () => {
        this.isConnected = false;
        this.logger.debug('[MQTT] Client đang ở trạng thái offline');
      });

      this.client.on('reconnect', () => {
        this.logger.debug('[MQTT] Đang thử kết nối lại tới Broker...');
      });
    } catch (err) {
      this.logger.error('[MQTT] Không thể khởi tạo MQTT client', err);
    }
  }

  private subscribeTopics() {
    if (!this.client) return;

    const topics = [
      MQTT_TOPICS.TELEMETRY_WILDCARD,
      MQTT_TOPICS.POND_DEVICE_TELEMETRY_WILDCARD,
      MQTT_TOPICS.FEEDER_STATUS_WILDCARD,
      MQTT_TOPICS.HEARTBEAT_WILDCARD,
    ];

    for (const topic of topics) {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`[MQTT] Không thể subscribe topic ${topic}: ${err.message}`);
        } else {
          this.logger.log(`[MQTT] Đã subscribe topic thành công: ${topic}`);
        }
      });
    }
  }

  private async handleIncomingMessage(topic: string, payload: Buffer) {
    try {
      const rawText = payload.toString('utf-8');
      const data = JSON.parse(rawText);

      if (topic.includes('/telemetry')) {
        await this.processTelemetryMessage(topic, data);
      } else if (topic.includes('/feeder/status')) {
        await this.processFeederStatusMessage(topic, data);
      } else if (topic.includes('/heartbeat')) {
        await this.processHeartbeatMessage(topic, data);
      }
    } catch (err) {
      this.logger.error(`[MQTT] Lỗi phân tích gói tin từ topic [${topic}]`, err);
    }
  }

  private async processTelemetryMessage(topic: string, data: MqttTelemetryPayload) {
    // 1. Phân giải deviceUid từ payload hoặc từ topic
    let deviceUid = data.deviceUid;
    let pondId = data.pondId;

    if (!deviceUid) {
      const parts = topic.split('/');
      // shrimpmate/telemetry/{deviceUid}
      if (parts.length === 3 && parts[1] === 'telemetry') {
        deviceUid = parts[2];
      } else if (parts.length === 6 && parts[3] === 'devices') {
        // shrimpmate/ponds/{pondId}/devices/{deviceUid}/telemetry
        pondId = pondId ?? parts[2];
        deviceUid = parts[4];
      }
    }

    let device: Device | null = null;
    if (deviceUid) {
      device = await this.deviceRepository.findOne({ where: { deviceUid } });
      if (device) {
        // Cập nhật trạng thái và thời điểm nhìn thấy thiết bị
        device.lastSeenAt = new Date();
        device.status = DeviceStatus.ONLINE;
        await this.deviceRepository.save(device);

        // Lấy pondId đã gán cho thiết bị nếu payload không gửi kèm
        if (!pondId && device.pondId) {
          pondId = device.pondId;
        }
      }
    }

    if (!pondId) {
      this.logger.warn(`[MQTT] Bỏ qua telemetry vì không xác định được pondId (deviceUid: ${deviceUid})`);
      return;
    }

    // Ghi nhận telemetry vào database thông qua TelemetryService
    await this.telemetryService.recordTelemetry(pondId, {
      deviceId: device?.id,
      ph: data.ph,
      dissolvedOxygenMgL: data.dissolvedOxygenMgL,
      temperatureC: data.temperatureC,
      salinityPpt: data.salinityPpt,
      ammoniaMgL: data.ammoniaMgL,
      turbidityNtu: data.turbidityNtu,
      measuredAt: data.measuredAt ?? new Date().toISOString(),
    });

    this.logger.log(`[MQTT] Đã xử lý bản ghi telemetry từ thiết bị ${deviceUid ?? 'unknown'} cho ao ${pondId}`);
  }

  private async processFeederStatusMessage(topic: string, data: MqttFeederStatusPayload) {
    this.logger.log(`[MQTT] Nhận phản hồi trạng thái feeder từ ${topic}: status=${data.status}`);

    if (data.recordId) {
      const record = await this.feedingRecordRepository.findOne({ where: { id: data.recordId } });
      if (record) {
        if (data.status === 'running') {
          record.status = FeedingStatus.RUNNING;
        } else if (data.status === 'completed') {
          record.status = FeedingStatus.COMPLETED;
          record.finishedAt = new Date();
        } else if (data.status === 'stopped') {
          record.status = FeedingStatus.STOPPED;
          record.finishedAt = new Date();
          record.stoppedReason = data.stoppedReason ?? record.stoppedReason;
        } else if (data.status === 'failed') {
          record.status = FeedingStatus.FAILED;
          record.finishedAt = new Date();
          record.stoppedReason = data.stoppedReason ?? 'Sự cố phần cứng máy cho ăn';
        }

        if (data.actualAmountKg !== undefined) {
          record.actualAmountKg = data.actualAmountKg;
        }

        await this.feedingRecordRepository.save(record);
        this.logger.log(`[MQTT] Đã cập nhật feeding record ${record.id} sang trạng thái ${record.status}`);
      }
    }
  }

  private async processHeartbeatMessage(_topic: string, data: MqttHeartbeatPayload) {
    if (!data.deviceUid) return;

    const device = await this.deviceRepository.findOne({ where: { deviceUid: data.deviceUid } });
    if (device) {
      device.lastSeenAt = new Date();
      device.status = DeviceStatus.ONLINE;
      if (data.firmwareVersion) {
        device.firmwareVersion = data.firmwareVersion;
      }
      if (data.ipAddress || data.rssi) {
        device.metadata = {
          ...device.metadata,
          ipAddress: data.ipAddress,
          rssi: data.rssi,
        };
      }
      await this.deviceRepository.save(device);
      this.logger.debug(`[MQTT] Heartbeat cập nhật cho thiết bị ${device.deviceUid}`);
    }
  }

  async publishFeederCommand(deviceUid: string, payload: MqttFeederCommandPayload): Promise<boolean> {
    const topic = MQTT_TOPICS.feederCommand(deviceUid);

    if (!this.client || !this.isConnected) {
      this.logger.warn(`[MQTT] Không thể gửi lệnh tới ${topic} vì chưa kết nối broker.`);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const message = JSON.stringify(payload);
      this.client?.publish(topic, message, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`[MQTT] Gửi lệnh feeder thất bại tới ${topic}: ${err.message}`);
          resolve(false);
        } else {
          this.logger.log(`[MQTT] Đã gửi lệnh feeder thành công tới ${topic}: ${message}`);
          resolve(true);
        }
      });
    });
  }
}
