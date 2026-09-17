import { IsEnum, IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { PondStatus } from '../../../database/entities';

export class UpdatePondDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 150)
  @Matches(/\S/, { message: 'Tên ao không được rỗng' })
  name?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(Number.EPSILON, { message: 'Diện tích ao phải lớn hơn 0' })
  areaM2?: number;

  @IsOptional()
  @IsEnum(PondStatus)
  status?: PondStatus;
}