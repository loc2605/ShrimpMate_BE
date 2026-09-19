export enum UserRole {
  ADMIN = 'admin',
  FARMER = 'farmer',
}

export enum FarmStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PondStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
}

export enum CropSeasonStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DeviceType {
  FEEDER = 'feeder',
  SENSOR_NODE = 'sensor_node',
  CAMERA = 'camera',
  EDGE_GATEWAY = 'edge_gateway',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export enum DeviceMode {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  EMERGENCY_STOP = 'emergency_stop',
}

export enum FeedingSource {
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  AI = 'ai',
}

export enum FeedingStatus {
  REQUESTED = 'requested',
  RUNNING = 'running',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

export enum AppetiteLevel {
  NONE = 0,
  WEAK = 1,
  NORMAL = 2,
  STRONG = 3,
}

export enum AiRecommendationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
}

export enum SafetyDecision {
  ALLOWED = 'allowed',
  ADJUSTED = 'adjusted',
  BLOCKED = 'blocked',
}

export enum AlertSeverity {
  MONITORING = 1,
  WARNING = 2,
  CRITICAL = 3,
}

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}