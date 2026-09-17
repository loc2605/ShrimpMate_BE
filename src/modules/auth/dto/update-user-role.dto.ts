import { IsEnum } from 'class-validator';
import { UserRole } from '../../../database/entities/enums';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}