import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { AuthModule } from '../auth/auth.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device, Pond]), PassportModule, AuthModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
