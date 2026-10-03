import { IsDateString, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class IngestCameraMetricsDto {
  @IsUUID()
  pondId!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceUid?: string;

  @IsOptional()
  @IsUUID()
  feedingRecordId?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  // 1. Diện tích thức ăn còn lại Rt (0.0 -> 1.0 hoặc m2)
  @IsNumber()
  @Min(0)
  remainingFeedAreaRt!: number;

  // 2. Mật độ tôm Dt
  @IsNumber()
  @Min(0)
  shrimpDensityDt!: number;

  // 3. Phân loại hành vi Ct (0..3 hoặc score)
  @IsNumber()
  @Min(0)
  @Max(3)
  behaviorClassificationCt!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  timeDeltaSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  frameUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
