import { IsArray, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCameraRoiDto {
  @IsNumber()
  @Min(0)
  x!: number;

  @IsNumber()
  @Min(0)
  y!: number;

  @IsNumber()
  @Min(1)
  width!: number;

  @IsNumber()
  @Min(1)
  height!: number;

  @IsOptional()
  @IsArray()
  polygon?: number[][];

  @IsOptional()
  @IsNumber()
  resolutionWidth?: number;

  @IsOptional()
  @IsNumber()
  resolutionHeight?: number;
}
