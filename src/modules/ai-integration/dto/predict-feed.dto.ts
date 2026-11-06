import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PredictFeedOverrideDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  doc?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(60.0)
  avgWeightG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  fisScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(15.0)
  doMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(-5.0)
  @Max(10.0)
  deltaTan?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  morningRainMm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  prevFeedAmountKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  waterChangeM3?: number;
}

