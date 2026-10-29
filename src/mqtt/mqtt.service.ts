import { forwardRef, Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Device } from '../database/entities/device.entity';
import { FeedingRecord } from '../database/entities/feeding-record.entity';
import { DeviceStatus, FeedingStatus } from '../database/entities/enums';
import { TelemetryService } from '../modules/telemetry/telemetry.service';
import { CameraService } from '../modules/camera/camera.service';
import { EventsGateway } from '../modules/events/events.gateway';
import {
  MQTT_TOPICS,
  MqttCameraFramePayload,
  MqttCameraMetricsPayload,
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
    @Inject(forwardRef(() => CameraService))
    private readonly cameraService: CameraService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(FeedingRecord)
    private readonly feedingRecordRepository: Repository<FeedingRecord>,
    private readonly eventsGateway: EventsGateway,
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

  private hasLoggedConnectionError = false;

  private connectBroker() {
    const brokerUrl = this.configService.get<string>('mqtt.brokerUrl', 'mqtt://localhost:1883');
    this.logger.log(`Đang khởi tạo kết nối MQTT Broker tại ${brokerUrl}...`);

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `shrimpmate_backend_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 10000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.hasLoggedConnectionError = false;
        this.logger.log(`[MQTT] Đã kết nối thành công tới MQTT Broker: ${brokerUrl}`);
        this.subscribeTopics();
      });

      this.client.on('message', (topic, payload) => {
        this.handleIncomingMessage(topic, payload);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        if (!this.hasLoggedConnectionError) {
          this.logger.error(
            `[MQTT] Mất kết nối tới MQTT Broker tại ${brokerUrl}: ${err.message}. Các lệnh điều khiển thiết bị thực tế sẽ báo lỗi cho đến khi kết nối được phục hồi!`,
          );
          this.hasLoggedConnectionError = true;
        }
      });

      this.client.on('offline', () => {
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        // Tự động kết nối lại ở background, không in log làm đầy màn hình
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
      MQTT_TOPICS.CAMERA_FRAME_WILDCARD,
      MQTT_TOPICS.CAMERA_METRICS_WILDCARD,
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
      } else if (topic.includes('/camera/') && topic.endsWith('/frame')) {
        await this.processCameraFrameMessage(topic, data);
      } else if (topic.includes('/camera/') && topic.endsWith('/metrics')) {
        await this.processCameraMetricsMessage(topic, data);
      }
    } catch (err) {
      this.logger.error(`[MQTT] Lỗi phân tích gói tin từ topic [${topic}]`, err);
    }
  }

  private async processCameraFrameMessage(topic: string, data: MqttCameraFramePayload) {
    let deviceUid = data.deviceUid;
    if (!deviceUid) {
      const parts = topic.split('/');
      // shrimpmate/camera/{deviceUid}/frame
      if (parts.length === 4) {
        deviceUid = parts[2];
      }
    }

    let pondId = data.pondId;
    let device: Device | null = null;
    if (deviceUid) {
      device = await this.deviceRepository.findOne({ where: { deviceUid } });
      if (device) {
        device.lastSeenAt = new Date();
        device.status = DeviceStatus.ONLINE;
        await this.deviceRepository.save(device);
        pondId = pondId ?? device.pondId ?? undefined;
      }
    }

    if (!pondId) {
      this.logger.warn(`[MQTT] Không xác định được pondId cho camera frame (deviceUid: ${deviceUid})`);
      return;
    }

    await this.cameraService.analyzeFrame({
      pondId,
      deviceId: device?.id,
      frameData: data.frameData,
      frameUrl: data.frameUrl,
      roi: data.roi as any,
    });
    this.logger.log(`[MQTT] Đã phân tích frame camera từ thiết bị ${deviceUid ?? 'unknown'} cho ao ${pondId}`);
  }

  private async processCameraMetricsMessage(topic: string, data: MqttCameraMetricsPayload) {
    let deviceUid = data.deviceUid;
    if (!deviceUid) {
      const parts = topic.split('/');
      // shrimpmate/camera/{deviceUid}/metrics
      if (parts.length === 4) {
        deviceUid = parts[2];
      }
    }

    let pondId = data.pondId;
    let device: Device | null = null;
    if (deviceUid) {
      device = await this.deviceRepository.findOne({ where: { deviceUid } });
      if (device) {
        device.lastSeenAt = new Date();
        device.status = DeviceStatus.ONLINE;
        await this.deviceRepository.save(device);
        pondId = pondId ?? device.pondId ?? undefined;
      }
    }

    if (!pondId) {
      this.logger.warn(`[MQTT] Không xác định được pondId cho camera metrics (deviceUid: ${deviceUid})`);
      return;
    }

    await this.cameraService.ingestMetrics({
      pondId,
      deviceId: device?.id,
      deviceUid,
      remainingFeedAreaRt: data.remainingFeedAreaRt,
      shrimpDensityDt: data.shrimpDensityDt,
      behaviorClassificationCt: data.behaviorClassificationCt,
      confidence: data.confidence,
      timestamp: data.timestamp,
    });
    this.logger.log(`[MQTT] Đã thu nhận chỉ số camera edge từ thiết bị ${deviceUid ?? 'unknown'} cho ao ${pondId}`);
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
    const recorded = await this.telemetryService.recordTelemetry(pondId, {
      deviceId: device?.id,
      ph: data.ph,
      dissolvedOxygenMgL: data.dissolvedOxygenMgL,
      temperatureC: data.temperatureC,
      salinityPpt: data.salinityPpt,
      ammoniaMgL: data.ammoniaMgL,
      turbidityNtu: data.turbidityNtu,
      measuredAt: data.measuredAt ?? new Date().toISOString(),
    });

    // Phát sự kiện WebSocket thời gian thực tới Web SCADA
    this.eventsGateway.broadcastTelemetry(pondId, {
      readingId: recorded.id,
      deviceId: device?.id,
      deviceUid,
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

        // Phát sự kiện WebSocket trạng thái feeder tới Web SCADA
        this.eventsGateway.broadcastFeederStatus(record.pondId, {
          recordId: record.id,
          status: record.status,
          actualAmountKg: record.actualAmountKg,
          stoppedReason: record.stoppedReason,
          finishedAt: record.finishedAt,
        });
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

      // Phát sự kiện WebSocket trạng thái thiết bị
      this.eventsGateway.broadcastDeviceStatus(device.id, {
        deviceUid: device.deviceUid,
        status: device.status,
        lastSeenAt: device.lastSeenAt,
        rssi: data.rssi,
      });
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
          this.eventsGateway.broadcastFeederStatus('all', {
            deviceUid,
            command: payload.command,
            feedAmountKg: payload.feedAmountKg,
            timestamp: payload.timestamp || new Date().toISOString(),
          });
          resolve(true);
        }
      });
    });
  }
}
