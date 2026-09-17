import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { AppetiteLevel, FeedingStatus } from '../../../database/entities/enums';

export class UpdateFeedingRecordDto {
  @IsOptional()
  @IsEnum(FeedingStatus)
  status?: FeedingStatus;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  actualAmountKg?: number | null;

  @IsOptional()
  @IsEnum(AppetiteLevel)
  appetiteLevel?: AppetiteLevel | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  leftoverPercent?: number | null;

  @IsOptional()
  @IsString()
  stoppedReason?: string | null;
}