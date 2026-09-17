import { ArrayNotEmpty, ArrayUnique, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateFeedingScheduleDto {
  @IsString()
  @Length(2, 150)
  name!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  timeOfDay!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  feedAmountKg!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  spreadRateKgPerMinute?: number | null;

  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
