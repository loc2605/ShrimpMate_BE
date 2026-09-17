export * from './alert.entity';
export * from './ai-recommendation.entity';
export * from './crop-season.entity';
export * from './device.entity';
export * from './enums';
export * from './farm.entity';
export * from './feeding-record.entity';
export * from './feeding-schedule.entity';
export * from './pond.entity';
export * from './safety-rule.entity';
export * from './telemetry-reading.entity';
export * from './user.entity';
export * from './user-pond-assignment.entity';

import { Alert } from './alert.entity';
import { AiRecommendation } from './ai-recommendation.entity';
import { CropSeason } from './crop-season.entity';
import { Device } from './device.entity';
import { Farm } from './farm.entity';
import { FeedingRecord } from './feeding-record.entity';
import { FeedingSchedule } from './feeding-schedule.entity';
import { Pond } from './pond.entity';
import { SafetyRule } from './safety-rule.entity';
import { TelemetryReading } from './telemetry-reading.entity';
import { User } from './user.entity';
import { UserPondAssignment } from './user-pond-assignment.entity';

export const entities = [
	User,
	UserPondAssignment,
	Farm,
	Pond,
	CropSeason,
	Device,
	FeedingSchedule,
	FeedingRecord,
	TelemetryReading,
	AiRecommendation,
	SafetyRule,
	Alert,
];