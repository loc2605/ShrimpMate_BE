import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordTelemetryDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  ph?: number;

  @IsOptional()
  @IsNumber()
  dissolvedOxygenMgL?: number;

  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @IsOptional()
  @IsNumber()
  salinityPpt?: number;

  @IsOptional()
  @IsNumber()
  ammoniaMgL?: number;

  @IsOptional()
  @IsNumber()
  turbidityNtu?: number;

  @IsOptional()
  @IsString()
  measuredAt?: string;
}
