export interface MqttTelemetryPayload {
  deviceUid?: string;
  pondId?: string;
  measuredAt?: string;
  ph?: number;
  dissolvedOxygenMgL?: number;
  temperatureC?: number;
  salinityPpt?: number;
  ammoniaMgL?: number;
  turbidityNtu?: number;
  rawData?: Record<string, unknown>;
}

export interface MqttFeederCommandPayload {
  command: 'FEED' | 'STOP';
  recordId?: string;
  feedAmountKg: number;
  spreadRateKgPerMinute?: number;
  durationSeconds?: number;
  timestamp: string;
}

export interface MqttFeederStatusPayload {
  recordId?: string;
  deviceUid: string;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  actualAmountKg?: number;
  stoppedReason?: string;
  timestamp: string;
}

export interface MqttHeartbeatPayload {
  deviceUid: string;
  status?: string;
  firmwareVersion?: string;
  ipAddress?: string;
  rssi?: number;
  timestamp: string;
}

export const MQTT_TOPICS = {
  TELEMETRY_WILDCARD: 'shrimpmate/telemetry/+',
  POND_DEVICE_TELEMETRY_WILDCARD: 'shrimpmate/ponds/+/devices/+/telemetry',
  FEEDER_STATUS_WILDCARD: 'shrimpmate/devices/+/feeder/status',
  HEARTBEAT_WILDCARD: 'shrimpmate/devices/+/heartbeat',

  feederCommand: (deviceUid: string) => `shrimpmate/devices/${deviceUid}/feeder/command`,
  feederStatus: (deviceUid: string) => `shrimpmate/devices/${deviceUid}/feeder/status`,
  heartbeat: (deviceUid: string) => `shrimpmate/devices/${deviceUid}/heartbeat`,
  telemetry: (deviceUid: string) => `shrimpmate/telemetry/${deviceUid}`,
};
