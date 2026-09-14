import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CropSeason } from '../../database/entities/crop-season.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CropSeasonController } from './crop-season.controller';
import { CropSeasonService } from './crop-season.service';

@Module({
  imports: [TypeOrmModule.forFeature([CropSeason, Pond]), PassportModule, AuthModule],
  controllers: [CropSeasonController],
  providers: [CropSeasonService],
  exports: [CropSeasonService],
})
export class CropSeasonModule {}
