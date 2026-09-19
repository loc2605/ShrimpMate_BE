import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/enums';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { CreatePondDto } from './dto/create-pond.dto';
import { UpdatePondDto } from './dto/update-pond.dto';
import { PaginationDto } from './dto/pagination.dto';
import { FarmPondService } from './farm-pond.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller('farms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmPondController {
  constructor(private readonly farmPondService: FarmPondService) {}

  @Get()
  @Roles(UserRole.FARMER)
  findAllFarms(@Query() pagination: PaginationDto, @CurrentUser() user: User) {
    return this.farmPondService.findAllFarms(pagination, user);
  }

  @Post()
  @Roles(UserRole.FARMER)
  createFarm(@Body() createFarmDto: CreateFarmDto, @CurrentUser() user: User) {
    return this.farmPondService.createFarm(createFarmDto, user);
  }

  @Get(':id')
  @Roles(UserRole.FARMER)
  findFarmById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.farmPondService.findFarmById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.FARMER)
  updateFarm(@Param('id') id: string, @Body() updateFarmDto: UpdateFarmDto, @CurrentUser() user: User) {
    return this.farmPondService.updateFarm(id, updateFarmDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.FARMER)
  removeFarm(@Param('id') id: string, @CurrentUser() user: User) {
    return this.farmPondService.removeFarm(id, user);
  }

  @Get(':farmId/ponds')
  @Roles(UserRole.FARMER)
  findAllPondsByFarm(@Param('farmId') farmId: string, @Query() pagination: PaginationDto, @CurrentUser() user: User) {
    return this.farmPondService.findAllPondsByFarm(farmId, pagination, user);
  }

  @Post(':farmId/ponds')
  @Roles(UserRole.FARMER)
  createPond(@Param('farmId') farmId: string, @Body() createPondDto: CreatePondDto, @CurrentUser() user: User) {
    return this.farmPondService.createPond(farmId, createPondDto, user);
  }

  @Get(':farmId/ponds/:id')
  @Roles(UserRole.FARMER)
  findPondById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.farmPondService.findPondById(id, user);
  }

  @Patch(':farmId/ponds/:id')
  @Roles(UserRole.FARMER)
  updatePond(@Param('id') id: string, @Body() updatePondDto: UpdatePondDto, @CurrentUser() user: User) {
    return this.farmPondService.updatePond(id, updatePondDto, user);
  }

  @Delete(':farmId/ponds/:id')
  @Roles(UserRole.FARMER)
  deletePond(@Param('id') id: string, @CurrentUser() user: User) {
    return this.farmPondService.removePond(id, user);
  }
}
