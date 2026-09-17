import { IsUUID } from 'class-validator';

export class AssignPondDto {
  @IsUUID()
  pondId!: string;
}