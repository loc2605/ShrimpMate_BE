import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pond } from '../../database/entities/pond.entity';
import { Farm } from '../../database/entities/farm.entity';
import { PondAccessService } from './pond-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pond, Farm])],
  providers: [PondAccessService],
  exports: [PondAccessService],
})
export class PondAccessModule {}

