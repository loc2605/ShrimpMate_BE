import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CreateCropSeasonDto } from './dto/create-crop-season.dto';
import { UpdateCropSeasonDto } from './dto/update-crop-season.dto';
import { CropSeasonService } from './crop-season.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CropSeasonController {
  constructor(private readonly cropSeasonService: CropSeasonService) {}

  @Get('ponds/:pondId/crop-seasons')
  @Roles(UserRole.FARMER)
  findAllByPond(@Param('pondId') pondId: string, @CurrentUser() user: User) {
    return this.cropSeasonService.findAllByPond(pondId, user);
  }

  @Post('ponds/:pondId/crop-seasons')
  @Roles(UserRole.FARMER)
  create(@Param('pondId') pondId: string, @Body() createDto: CreateCropSeasonDto, @CurrentUser() user: User) {
    return this.cropSeasonService.create(pondId, createDto, user);
  }

  @Get('crop-seasons/:id')
  @Roles(UserRole.FARMER)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cropSeasonService.findOne(id, user);
  }

  @Get('crop-seasons/:id/statistics')
  @Roles(UserRole.FARMER)
  getStatistics(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cropSeasonService.getStatistics(id, user);
  }

  @Patch('crop-seasons/:id')
  @Roles(UserRole.FARMER)
  update(@Param('id') id: string, @Body() updateDto: UpdateCropSeasonDto, @CurrentUser() user: User) {
    return this.cropSeasonService.update(id, updateDto, user);
  }

  @Delete('crop-seasons/:id')
  @Roles(UserRole.FARMER)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.cropSeasonService.remove(id, user);
  }
}

