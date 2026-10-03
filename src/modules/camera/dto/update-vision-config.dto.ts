import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateVisionConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weightRt?: number; // w1: trọng số diện tích thức ăn còn lại

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weightVt?: number; // w2: trọng số tốc độ tiêu thụ

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weightDt?: number; // w3: trọng số mật độ tôm

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weightCt?: number; // w4: trọng số phân loại hành vi

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  quantile25?: number; // q25: ngưỡng không ăn -> ăn yếu

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  quantile50?: number; // q50: ngưỡng ăn yếu -> bình thường

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  quantile75?: number; // q75: ngưỡng bình thường -> ăn mạnh

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  samplingIntervalSeconds?: number;
}
