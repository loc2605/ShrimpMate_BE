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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAll(@CurrentUser() user: User) {
    return this.devicesService.findAllDevices(user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.createDevice(createDeviceDto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.devicesService.findDeviceById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto, @CurrentUser() user: User) {
    return this.devicesService.updateDevice(id, updateDeviceDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.devicesService.removeDevice(id);
  }

  @Post(':id/emergency-stop')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  emergencyStop(@Param('id') id: string, @CurrentUser() user: User) {
    return this.devicesService.emergencyStop(id, user);
  }

  @Post(':id/heartbeat')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  heartbeat(@Param('id') id: string, @CurrentUser() user: User) {
    return this.devicesService.heartbeat(id, user);
  }
}
