import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import { Device } from '../database/entities/device.entity';
import { FeedingRecord } from '../database/entities/feeding-record.entity';
import { DeviceStatus, FeedingStatus } from '../database/entities/enums';
import { TelemetryService } from '../modules/telemetry/telemetry.service';
import { EventsGateway } from '../modules/events/events.gateway';
import {
  MQTT_TOPICS,
  MqttFeederAckPayload,
  MqttFeederCommandPayload,
  MqttFeederStatusPayload,
  MqttHeartbeatPayload,
  MqttTelemetryPayload,
} from './mqtt.types';

const REALTIME_TELEMETRY_MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

interface NormalizedMqttTelemetryTimestamp {
  measuredAt: string;
  rawData: Record<string, unknown>;
  adjusted: boolean;
  clockSkewMs?: number | null;
}

export function normalizeMqttTelemetryTimestamp(
  deviceMeasuredAt: string | undefined,
  rawData: Record<string, unknown> | undefined,
  receivedAt: Date,
  isBuffered: boolean,
): NormalizedMqttTelemetryTimestamp {
  const receivedAtIso = receivedAt.toISOString();
  const initialRawData = rawData ?? {};
  if (!deviceMeasuredAt) {
    return { measuredAt: receivedAtIso, rawData: initialRawData, adjusted: false };
  }

  const deviceTime = new Date(deviceMeasuredAt);
  const clockSkewMs = receivedAt.getTime() - deviceTime.getTime();
  const isValidDeviceTime = Number.isFinite(deviceTime.getTime());
  const shouldUseReceiveTime = !isBuffered &&
    (!isValidDeviceTime || Math.abs(clockSkewMs) > REALTIME_TELEMETRY_MAX_CLOCK_SKEW_MS);

  if (!shouldUseReceiveTime) {
    return { measuredAt: deviceMeasuredAt, rawData: initialRawData, adjusted: false };
  }

  const timestampDiagnostics = {
    reportedMeasuredAt: deviceMeasuredAt,
    receivedAt: receivedAtIso,
    clockSkewMs: isValidDeviceTime ? clockSkewMs : null,
    adjusted: true,
  };

  return {
    measuredAt: receivedAtIso,
    rawData: { ...initialRawData, timestampDiagnostics },
    adjusted: true,
    clockSkewMs: timestampDiagnostics.clockSkewMs,
  };
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;
  private readonly feederAckWaiters = new Map<string, (ack: MqttFeederAckPayload) => void>();

  constructor(
    private readonly configService: ConfigService,
    private readonly telemetryService: TelemetryService,
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
        // Tự động kết nối lại ở background
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
      MQTT_TOPICS.FEEDER_ACK_WILDCARD,
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
      } else if (topic.includes('/feeder/ack')) {
        await this.processFeederAckMessage(topic, data);
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
        device.lastSeenAt = new Date();
        device.status = DeviceStatus.ONLINE;
        await this.deviceRepository.save(device);

        if (!pondId && device.pondId) {
          pondId = device.pondId;
        }
      }
    }

    if (!pondId) {
      this.logger.warn(`[MQTT] Bỏ qua telemetry vì không xác định được pondId (deviceUid: ${deviceUid})`);
      return;
    }

    const isBuffered = Boolean(data.isBuffered);
    const receivedAt = new Date();
    const normalizedTimestamp = normalizeMqttTelemetryTimestamp(
      data.measuredAt,
      data.rawData,
      receivedAt,
      isBuffered,
    );
    if (normalizedTimestamp.adjusted) {
      this.logger.warn(
        `[MQTT] Timestamp telemetry lệch đồng hồ thiết bị; dùng thời gian nhận từ backend ` +
          `(deviceUid=${deviceUid}, skewMs=${normalizedTimestamp.clockSkewMs ?? 'invalid'})`,
      );
    }

    const recorded = await this.telemetryService.recordTelemetry(pondId, {
      deviceId: device?.id,
      ph: data.ph,
      dissolvedOxygenMgL: data.dissolvedOxygenMgL,
      temperatureC: data.temperatureC,
      salinityPpt: data.salinityPpt,
      ammoniaMgL: data.ammoniaMgL,
      tanMgL: data.tanMgL,
      turbidityNtu: data.turbidityNtu,
      isBuffered,
      measuredAt: normalizedTimestamp.measuredAt,
      rawData: normalizedTimestamp.rawData,
    });

    this.eventsGateway.broadcastTelemetry(pondId, {
      readingId: recorded.id,
      deviceId: device?.id,
      deviceUid,
      ph: data.ph,
      dissolvedOxygenMgL: data.dissolvedOxygenMgL,
      temperatureC: data.temperatureC,
      salinityPpt: data.salinityPpt,
      ammoniaMgL: data.ammoniaMgL,
      tanMgL: data.tanMgL,
      turbidityNtu: data.turbidityNtu,
      isBuffered,
      measuredAt: normalizedTimestamp.measuredAt,
      rawData: normalizedTimestamp.rawData,
    });

    const rawData = data.rawData ?? {};
    const formatValue = (value: unknown, fractionDigits: number): string =>
      typeof value === 'number'
        ? value.toFixed(fractionDigits)
        : value === undefined || value === null
          ? 'không có'
          : String(value);
    const clockSkewSeconds =
      normalizedTimestamp.clockSkewMs === undefined ||
      normalizedTimestamp.clockSkewMs === null
        ? 'không xác định'
        : `${Math.abs(normalizedTimestamp.clockSkewMs / 1000).toFixed(2)} giây (${
            normalizedTimestamp.clockSkewMs > 0
              ? 'thiết bị chậm'
              : normalizedTimestamp.clockSkewMs < 0
                ? 'thiết bị nhanh'
                : 'đồng bộ'
          })`;
    const metrics = [
      `pH=${formatValue(data.ph, 2)}`,
      `Oxy hòa tan(DO)=${formatValue(data.dissolvedOxygenMgL, 2)} mg/L`,
      `Nhiệt độ nước=${formatValue(data.temperatureC, 1)}°C`,
      `Độ mặn=${formatValue(data.salinityPpt, 1)} ppt`,
      `Amoniac(NH3)=${formatValue(data.ammoniaMgL, 2)} mg/L`,
      `Tổng nitơ amoni(TAN)=${formatValue(data.tanMgL, 2)} mg/L`,
      `Độ đục=${formatValue(data.turbidityNtu, 0)} NTU`,
      `Nhiệt độ không khí=${formatValue(rawData['airTemperatureC'], 1)}°C`,
      `Độ ẩm không khí=${formatValue(rawData['humidityPercent'], 1)}%`,
      `Lượng mưa=${formatValue(rawData['rainMm'], 1)} mm`,
      `Lượng nước thay=${formatValue(rawData['waterChangeM3'], 2)} m³`,
      `Ao=${pondId}`,
      `Giờ thiết bị=${data.measuredAt ?? 'không có'}`,
      `Giờ backend lưu=${normalizedTimestamp.measuredAt}`,
      `Độ lệch đồng hồ=${clockSkewSeconds}`,
    ];

    this.logger.log(
      `[MQTT] [${deviceUid ?? 'DEV'}] -> [Telemetry] ${metrics.join(' | ')}`,
    );
  }

  private async processFeederAckMessage(topic: string, data: MqttFeederAckPayload) {
    this.logger.log(`[MQTT] Nhận phản hồi ACK từ ${topic}: recordId=${data.recordId}, status=${data.status}`);
    if (data.recordId && this.feederAckWaiters.has(data.recordId)) {
      const resolver = this.feederAckWaiters.get(data.recordId);
      this.feederAckWaiters.delete(data.recordId);
      resolver?.(data);
    }
  }

  private async processFeederStatusMessage(topic: string, data: MqttFeederStatusPayload) {
    this.logger.log(`[MQTT] Nhận phản hồi trạng thái feeder từ ${topic}: status=${data.status}`);

    // Kích hoạt implicit ACK nếu máy ăn báo running mà chưa có bản tin ACK riêng
    if (data.recordId && data.status === 'running' && this.feederAckWaiters.has(data.recordId)) {
      const resolver = this.feederAckWaiters.get(data.recordId);
      this.feederAckWaiters.delete(data.recordId);
      resolver?.({
        recordId: data.recordId,
        deviceUid: data.deviceUid,
        status: 'ACK',
        message: 'Implicit ACK from status:running',
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }

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

  /**
   * Chờ xác nhận ACK từ máy cho ăn với thời gian chờ (timeout)
   */
  async waitForFeederAck(recordId: string, timeoutMs = 20000): Promise<MqttFeederAckPayload | null> {
    return new Promise<MqttFeederAckPayload | null>((resolve) => {
      const timer = setTimeout(() => {
        this.feederAckWaiters.delete(recordId);
        this.logger.warn(`[MQTT] Quá thời gian ${timeoutMs}ms không nhận được phản hồi ACK cho cữ ăn ${recordId}`);
        resolve(null);
      }, timeoutMs);

      this.feederAckWaiters.set(recordId, (ack) => {
        clearTimeout(timer);
        resolve(ack);
      });
    });
  }
}
