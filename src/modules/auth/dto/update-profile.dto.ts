import { IsOptional, IsString, Length } from 'class-validator';
import { IsVietnamPhoneNumber } from './phone-number.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsVietnamPhoneNumber()
  phoneNumber?: string;
}
