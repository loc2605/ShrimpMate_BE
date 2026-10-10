import { IsArray, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AssignFarmerDto {
  @IsOptional()
  @IsUUID('4', { message: 'farmerId phải là UUID hợp lệ' })
  farmerId?: string;

  @IsNotEmpty({ message: 'farmId không được để trống' })
  @IsUUID('4', { message: 'farmId phải là UUID hợp lệ' })
  farmId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'pondId phải là UUID hợp lệ' })
  pondId?: string;

  @IsOptional()
  @IsArray({ message: 'pondIds phải là một danh sách UUID' })
  @IsUUID('4', { each: true, message: 'Từng pondId phải là UUID hợp lệ' })
  pondIds?: string[];
}
