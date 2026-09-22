import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSafetyRuleDto {
  @IsNotEmpty()
  @IsString()
  code!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  priority?: number = 100;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = true;

  @IsNotEmpty()
  @IsObject()
  condition!: Record<string, unknown>;

  @IsNotEmpty()
  @IsObject()
  action!: Record<string, unknown>;
}
