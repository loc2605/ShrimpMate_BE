import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { FarmStatus } from '../../../database/entities';

export class CreateFarmDto {
  @IsString()
  @Length(2, 150)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(FarmStatus)
  status?: FarmStatus;
}
