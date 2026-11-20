import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { User } from '../../database/entities/user.entity';
import { AdminService } from './admin.service';
import { AiIntegrationService } from '../ai-integration/ai-integration.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly aiIntegrationService: AiIntegrationService,
  ) {}

  @Get('ai-service-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getAiServiceStatus() {
    return this.aiIntegrationService.checkAiServiceHealth();
  }

  @Post('ai-service/retrain')
  @Roles(UserRole.ADMIN)
  retrainAiModel(@CurrentUser() user: User) {
    return this.aiIntegrationService.triggerModelRetrain(user);
  }

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('reports/operational')
  getOperationalReport() {
    return this.adminService.getOperationalReport();
  }

  @Get('reports/fcr')
  getFcrReport() {
    return this.adminService.getFcrReport();
  }
}
