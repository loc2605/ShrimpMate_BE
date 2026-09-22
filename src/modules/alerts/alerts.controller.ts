import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { AlertsService } from './alerts.service';
import { QueryAlertDto } from './dto/query-alert.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('alerts/summary')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  getAlertsSummary(
    @CurrentUser() user: User,
    @Query('pondId') pondId?: string,
  ) {
    return this.alertsService.getAlertsSummary(user, pondId);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  getAllAlerts(
    @CurrentUser() user: User,
    @Query() queryDto: QueryAlertDto,
  ) {
    return this.alertsService.getAllAlerts(user, queryDto);
  }

  @Get('ponds/:pondId/alerts')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  getPondAlerts(
    @Param('pondId') pondId: string,
    @Query() queryDto: QueryAlertDto,
    @CurrentUser() user: User,
  ) {
    return this.alertsService.getAlertsByPond(pondId, user, queryDto);
  }

  @Patch('alerts/:id/acknowledge')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  acknowledgeAlert(@Param('id') id: string, @CurrentUser() user: User) {
    return this.alertsService.acknowledgeAlert(id, user);
  }

  @Patch('alerts/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  resolveAlert(@Param('id') id: string, @CurrentUser() user: User) {
    return this.alertsService.resolveAlert(id, user);
  }
}
