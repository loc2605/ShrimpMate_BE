import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPondAssignment } from '../../database/entities/user-pond-assignment.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Farm } from '../../database/entities/farm.entity';
import { PondAccessService } from './pond-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserPondAssignment, Pond, Farm])],
  providers: [PondAccessService],
  exports: [PondAccessService],
})
export class PondAccessModule {}
