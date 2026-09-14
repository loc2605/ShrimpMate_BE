import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { CropSeasonStatus } from '../../../database/entities';

export class CreateCropSeasonDto {
  @IsString()
  @Length(2, 150)
  name!: string;

  @IsDateString()
  stockingDate!: string;

  @IsInt()
  @Min(1)
  initialCount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  stockingDensity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  initialAverageWeightG?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  estimatedSurvivalRate?: number;

  @IsOptional()
  @IsEnum(CropSeasonStatus)
  status?: CropSeasonStatus;
}
