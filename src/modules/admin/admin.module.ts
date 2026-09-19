import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { Device } from '../../database/entities/device.entity';
import { Alert } from '../../database/entities/alert.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Farm, Pond, Device, Alert]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
