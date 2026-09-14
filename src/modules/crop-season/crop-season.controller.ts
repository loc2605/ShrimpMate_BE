import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CreateCropSeasonDto } from './dto/create-crop-season.dto';
import { UpdateCropSeasonDto } from './dto/update-crop-season.dto';
import { CropSeasonService } from './crop-season.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CropSeasonController {
  constructor(private readonly cropSeasonService: CropSeasonService) {}

  @Get('ponds/:pondId/crop-seasons')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findAllByPond(@Param('pondId') pondId: string) {
    return this.cropSeasonService.findAllByPond(pondId);
  }

  @Post('ponds/:pondId/crop-seasons')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Param('pondId') pondId: string, @Body() createDto: CreateCropSeasonDto) {
    return this.cropSeasonService.create(pondId, createDto);
  }

  @Get('crop-seasons/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  findOne(@Param('id') id: string) {
    return this.cropSeasonService.findOne(id);
  }

  @Patch('crop-seasons/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateDto: UpdateCropSeasonDto) {
    return this.cropSeasonService.update(id, updateDto);
  }

  @Delete('crop-seasons/:id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.cropSeasonService.remove(id);
  }
}
