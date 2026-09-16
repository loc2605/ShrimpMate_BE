import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { DevicesService } from './devices.service';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll() {
    return this.devicesService.findAllDevices();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.createDevice(createDeviceDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id') id: string) {
    return this.devicesService.findDeviceById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.updateDevice(id, updateDeviceDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.devicesService.removeDevice(id);
  }
}
