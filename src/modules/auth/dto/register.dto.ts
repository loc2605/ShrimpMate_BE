import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { IsVietnamPhoneNumber } from './phone-number.decorator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsVietnamPhoneNumber()
  phoneNumber!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsString()
  @Length(2, 150)
  fullName!: string;
}
