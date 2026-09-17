import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPondAssignment } from '../../database/entities/user-pond-assignment.entity';
import { PondAccessService } from './pond-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserPondAssignment])],
  providers: [PondAccessService],
  exports: [PondAccessService],
})
export class PondAccessModule {}
