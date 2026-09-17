import { IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(3, 255)
  identifier!: string;

  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải gồm 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'Mã OTP phải gồm 6 chữ số' })
  otp!: string;

  @IsString()
  @Length(8, 72)
  newPassword!: string;
}
