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

export interface MqttCameraFramePayload {
  deviceUid?: string;
  pondId?: string;
  frameData?: string;
  frameUrl?: string;
  timestamp?: string;
  roi?: Record<string, unknown>;
}

export interface MqttCameraMetricsPayload {
  deviceUid?: string;
  pondId?: string;
  remainingFeedAreaRt: number;
  shrimpDensityDt: number;
  behaviorClassificationCt: number;
  timestamp?: string;
  confidence?: number;
}

export const MQTT_TOPICS = {
  TELEMETRY_WILDCARD: 'shrimpmate/telemetry/+',
  POND_DEVICE_TELEMETRY_WILDCARD: 'shrimpmate/ponds/+/devices/+/telemetry',
  FEEDER_STATUS_WILDCARD: 'shrimpmate/devices/+/feeder/status',
  HEARTBEAT_WILDCARD: 'shrimpmate/devices/+/heartbeat',
  CAMERA_FRAME_WILDCARD: 'shrimpmate/camera/+/frame',
  CAMERA_METRICS_WILDCARD: 'shrimpmate/camera/+/metrics',

  feederCommand: (deviceUid: string) => `shrimpmate/devices/${deviceUid}/feeder/command`,
  feederStatus: (deviceUid: string) => `shrimpmate/devices/${deviceUid}/feeder/status`,
  heartbeat: (deviceUid: string) => `shrimpmate/devices/${deviceUid}/heartbeat`,
  telemetry: (deviceUid: string) => `shrimpmate/telemetry/${deviceUid}`,
  cameraFrame: (deviceUid: string) => `shrimpmate/camera/${deviceUid}/frame`,
  cameraMetrics: (deviceUid: string) => `shrimpmate/camera/${deviceUid}/metrics`,
};
