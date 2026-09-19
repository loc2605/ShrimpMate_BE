import { IsString, IsUUID, Length } from 'class-validator';

export class ClaimDeviceDto {
  @IsString()
  @Length(3, 100)
  deviceUid!: string;

  @IsUUID()
  pondId!: string;
}
