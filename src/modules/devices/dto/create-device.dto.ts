import { IsEnum, IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { DeviceMode, DeviceStatus, DeviceType } from '../../../database/entities/enums';

export class CreateDeviceDto {
  @IsString()
  @Length(3, 100)
  deviceUid!: string;

  @IsString()
  @Length(2, 150)
  name!: string;

  @IsEnum(DeviceType)
  type!: DeviceType;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsEnum(DeviceMode)
  mode?: DeviceMode;

  @IsOptional()
  @IsUUID()
  pondId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  firmwareVersion?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
