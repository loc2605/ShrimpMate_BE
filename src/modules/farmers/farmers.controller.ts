import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { FarmersService } from './farmers.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { AssignFarmerDto } from './dto/assign-farmer.dto';

@Controller('farmers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  /**
   * UC020: Manager tạo tài khoản cho Farmer với mật khẩu ngẫu nhiên
   */
  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  createFarmer(@CurrentUser() manager: User, @Body() dto: CreateFarmerDto) {
    return this.farmersService.createFarmer(manager, dto);
  }

  /**
   * UC020: Danh sách Farmer thuộc quyền quản lý của Manager
   */
  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findAllFarmers(@CurrentUser() user: User) {
    return this.farmersService.findAllFarmers(user);
  }

  /**
   * UC021: Gán ao nuôi / trang trại cho Farmer (qua body chứa farmerId)
   */
  @Post('assignments')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  assignFarmerDirect(@Body() dto: AssignFarmerDto, @CurrentUser() user: User) {
    return this.farmersService.assignFarmer(dto.farmerId, dto, user);
  }

  /**
   * UC021: Danh sách tất cả phân công của Manager
   */
  @Get('assignments/list')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  listAllAssignments(@CurrentUser() user: User) {
    return this.farmersService.listAllAssignments(user);
  }

  /**
   * UC021: Thu hồi một bản ghi phân công trực tiếp bằng assignmentId
   */
  @Delete('assignments/:assignmentId')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  removeAssignmentDirect(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.removeAssignment(assignmentId, user);
  }

  /**
   * Xem chi tiết Farmer và các ao/trại được phân công
   */
  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findFarmerById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.farmersService.findFarmerById(id, user);
  }

  /**
   * UC020: Cập nhật thông tin Farmer
   */
  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateFarmer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFarmerDto,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.updateFarmer(id, dto, user);
  }

  /**
   * UC020: Khóa hoặc mở khóa tài khoản Farmer
   */
  @Patch(':id/status')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  toggleFarmerStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.toggleFarmerStatus(id, isActive ?? false, user);
  }

  /**
   * UC021: Gán ao nuôi (hoặc toàn bộ trang trại) cho Farmer
   */
  @Post(':id/assignments')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  assignFarmer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignFarmerDto,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.assignFarmer(id, dto, user);
  }

  /**
   * Xem danh sách phân công của một Farmer
   */
  @Get(':id/assignments')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.FARMER)
  getFarmerAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.getFarmerAssignments(id, user);
  }

  /**
   * UC021: Thu hồi một bản ghi phân công cụ thể
   */
  @Delete(':id/assignments/:assignmentId')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  removeAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.removeAssignment(assignmentId, user);
  }

  /**
   * UC021: Thu hồi toàn bộ phân công của Farmer
   */
  @Delete(':id/assignments')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  clearFarmerAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.farmersService.clearFarmerAssignments(id, user);
  }
}
