import { IsEmail, IsEnum, IsString, Length, MaxLength } from 'class-validator';
import { UserRole } from '../../../database/entities/enums';

export class AdminCreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsString()
  @Length(2, 150)
  fullName!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}