import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { FarmStatus } from '../../../database/entities';

export class UpdateFarmDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  @Matches(/\S/, { message: 'Tên trang trại không được rỗng' })
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(FarmStatus)
  status?: FarmStatus;
}
