import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { TelemetryService } from './telemetry.service';
import { RecordTelemetryDto } from './dto/record-telemetry.dto';

@Controller('ponds/:pondId/telemetry')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('latest')
  @Roles(UserRole.FARMER)
  getLatest(@Param('pondId') pondId: string, @CurrentUser() user: User) {
    return this.telemetryService.getLatest(pondId, user);
  }

  @Get('history')
  @Roles(UserRole.FARMER)
  getHistory(
    @Param('pondId') pondId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: User,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.telemetryService.getHistory(pondId, user, parsedLimit);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  recordTelemetry(
    @Param('pondId') pondId: string,
    @Body() dto: RecordTelemetryDto,
    @CurrentUser() user: User,
  ) {
    return this.telemetryService.recordTelemetry(pondId, dto, user);
  }
}
