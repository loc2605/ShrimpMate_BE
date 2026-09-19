import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { CropSeasonController } from './crop-season.controller';
import { CropSeasonService } from './crop-season.service';
import { PondAccessModule } from '../../common/guards/pond-access.module';

@Module({
  imports: [TypeOrmModule.forFeature([CropSeason, Pond, FeedingRecord]), PondAccessModule],
  controllers: [CropSeasonController],
  providers: [CropSeasonService],
  exports: [CropSeasonService],
})
export class CropSeasonModule {}
