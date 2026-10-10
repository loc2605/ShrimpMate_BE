import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFarmerDto {
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  @MaxLength(20)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email?: string;
}
