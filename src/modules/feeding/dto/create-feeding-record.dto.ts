import { IsDateString, IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { AppetiteLevel, FeedingSource, FeedingStatus } from '../../../database/entities/enums';

export class CreateFeedingRecordDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string | null;

  @IsOptional()
  @IsUUID()
  scheduleId?: string | null;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  requestedAmountKg!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  actualAmountKg?: number | null;

  @IsEnum(FeedingSource)
  source!: FeedingSource;

  @IsOptional()
  @IsEnum(FeedingStatus)
  status?: FeedingStatus;

  @IsOptional()
  @IsEnum(AppetiteLevel)
  appetiteLevel?: AppetiteLevel | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  leftoverPercent?: number | null;

  @IsOptional()
  stoppedReason?: string | null;
}
