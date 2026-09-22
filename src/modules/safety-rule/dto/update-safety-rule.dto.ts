import { IsBoolean, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSafetyRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  action?: Record<string, unknown>;
}
