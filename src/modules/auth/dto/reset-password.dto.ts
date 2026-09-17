import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải gồm 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'Mã OTP phải gồm 6 chữ số' })
  otp!: string;

  @IsString()
  @Length(8, 72)
  newPassword!: string;
}
