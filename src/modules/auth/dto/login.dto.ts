import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 255)
  identifier!: string;

  @IsString()
  @Length(1, 72)
  password!: string;
}
