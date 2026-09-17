import { IsString, Length } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @Length(3, 255)
  identifier!: string;
}
