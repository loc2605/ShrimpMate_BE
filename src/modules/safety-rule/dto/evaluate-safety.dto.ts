import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class EvaluateSafetyDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  requestedAmountKg?: number;
}
