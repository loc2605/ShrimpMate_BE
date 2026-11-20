import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecordFeedingFeedbackDto {
  @IsNumber()
  @Min(0.0)
  @Max(100.0)
  leftoverPercent!: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(360)
  trayInspectionMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  gutFullnessScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
