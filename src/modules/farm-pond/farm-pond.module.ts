import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { FarmPondController } from './farm-pond.controller';
import { FarmPondService } from './farm-pond.service';

@Module({
  imports: [TypeOrmModule.forFeature([Farm, Pond]), PondAccessModule],
  controllers: [FarmPondController],
  providers: [FarmPondService],
  exports: [FarmPondService],
})
export class FarmPondModule {}
