import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { PondStatus } from '../../../database/entities';

export class CreatePondDto {
  @IsString()
  @Length(2, 50)
  code!: string;

  @IsString()
  @Length(2, 150)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  areaM2!: number;

  @IsOptional()
  @IsEnum(PondStatus)
  status?: PondStatus;
}
