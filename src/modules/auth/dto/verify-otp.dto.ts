import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsString()
  identifier!: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp!: string;
}
