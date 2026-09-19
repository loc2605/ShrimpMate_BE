import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { AlertsService } from './alerts.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('alerts')
  @Roles(UserRole.FARMER)
  getAllAlerts(@CurrentUser() user: User) {
    return this.alertsService.getAllAlertsForFarmer(user);
  }

  @Get('ponds/:pondId/alerts')
  @Roles(UserRole.FARMER)
  getPondAlerts(@Param('pondId') pondId: string, @CurrentUser() user: User) {
    return this.alertsService.getAlertsByPond(pondId, user);
  }

  @Patch('alerts/:id/acknowledge')
  @Roles(UserRole.FARMER)
  acknowledgeAlert(@Param('id') id: string, @CurrentUser() user: User) {
    return this.alertsService.acknowledgeAlert(id, user);
  }

  @Patch('alerts/:id/resolve')
  @Roles(UserRole.FARMER)
  resolveAlert(@Param('id') id: string, @CurrentUser() user: User) {
    return this.alertsService.resolveAlert(id, user);
  }
}
