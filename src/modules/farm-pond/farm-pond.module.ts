import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AuthModule } from '../auth/auth.module';
import { FarmPondController } from './farm-pond.controller';
import { FarmPondService } from './farm-pond.service';

@Module({
  imports: [TypeOrmModule.forFeature([Farm, Pond]), PassportModule, AuthModule],
  controllers: [FarmPondController],
  providers: [FarmPondService],
  exports: [FarmPondService],
})
export class FarmPondModule {}
