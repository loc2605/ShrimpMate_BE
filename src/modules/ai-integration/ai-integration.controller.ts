import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { AiIntegrationService } from './ai-integration.service';
import { PredictFeedOverrideDto } from './dto/predict-feed.dto';

@Controller('ponds/:pondId/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiIntegrationController {
  constructor(private readonly aiService: AiIntegrationService) {}

  @Post('predict-feed')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FARMER)
  predictFeed(
    @Param('pondId') pondId: string,
    @CurrentUser() user: User,
    @Body() dto?: PredictFeedOverrideDto,
  ) {
    return this.aiService.predictFeedDemand(pondId, user, dto);
  }

  @Get('forecast-biomass')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FARMER)
  forecastBiomass(
    @Param('pondId') pondId: string,
    @CurrentUser() user: User,
  ) {
    return this.aiService.getBiomassForecast(pondId, user);
  }

  @Get('recommendations/latest')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FARMER)
  getLatest(@Param('pondId') pondId: string, @CurrentUser() user: User) {
    return this.aiService.getLatestRecommendation(pondId, user);
  }

  @Get('recommendations')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.FARMER)
  getRecommendations(
    @Param('pondId') pondId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: User,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.aiService.getRecommendations(pondId, user, parsedLimit);
  }
}
