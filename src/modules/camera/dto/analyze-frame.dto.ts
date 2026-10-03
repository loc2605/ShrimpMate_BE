import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RoiConfigDto {
  @IsNumber()
  @Min(0)
  x!: number;

  @IsNumber()
  @Min(0)
  y!: number;

  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;

  @IsOptional()
  polygon?: number[][];

  @IsOptional()
  @IsNumber()
  resolutionWidth?: number;

  @IsOptional()
  @IsNumber()
  resolutionHeight?: number;
}

export class AnalyzeFrameDto {
  @IsUUID()
  pondId!: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  feedingRecordId?: string;

  @IsOptional()
  @IsString()
  frameData?: string; // base64 encoded frame or image buffer

  @IsOptional()
  @IsString()
  frameUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  timeDeltaSeconds?: number;

  @IsOptional()
  @IsObject()
  roi?: RoiConfigDto;

  @IsOptional()
  @IsObject()
  simulatedMetrics?: {
    remainingFeedAreaRt?: number;
    shrimpDensityDt?: number;
    behaviorClassificationCt?: number;
  };
}
