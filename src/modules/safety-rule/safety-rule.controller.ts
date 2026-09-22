import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { SafetyRuleService } from './safety-rule.service';
import { SafetyRuleEngineService } from './safety-rule-engine.service';
import { CreateSafetyRuleDto } from './dto/create-safety-rule.dto';
import { UpdateSafetyRuleDto } from './dto/update-safety-rule.dto';
import { EvaluateSafetyDto } from './dto/evaluate-safety.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SafetyRuleController {
  constructor(
    private readonly safetyRuleService: SafetyRuleService,
    private readonly safetyRuleEngineService: SafetyRuleEngineService,
    private readonly pondAccessService: PondAccessService,
  ) {}

  @Get('safety-rules')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  findAllRules() {
    return this.safetyRuleService.findAll();
  }

  @Post('safety-rules')
  @Roles(UserRole.ADMIN)
  createRule(@Body() dto: CreateSafetyRuleDto) {
    return this.safetyRuleService.create(dto);
  }

  @Get('safety-rules/:id')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  findOneRule(@Param('id') id: string) {
    return this.safetyRuleService.findOne(id);
  }

  @Patch('safety-rules/:id')
  @Roles(UserRole.ADMIN)
  updateRule(@Param('id') id: string, @Body() dto: UpdateSafetyRuleDto) {
    return this.safetyRuleService.update(id, dto);
  }

  @Delete('safety-rules/:id')
  @Roles(UserRole.ADMIN)
  removeRule(@Param('id') id: string) {
    return this.safetyRuleService.remove(id);
  }

  @Post('ponds/:pondId/safety-rules/evaluate')
  @Roles(UserRole.ADMIN, UserRole.FARMER)
  async evaluateFeedingSafety(
    @Param('pondId') pondId: string,
    @Body() dto: EvaluateSafetyDto,
    @CurrentUser() user: User,
  ) {
    await this.pondAccessService.ensureCanAccess(user, pondId);
    return this.safetyRuleEngineService.evaluateFeedingSafety(
      pondId,
      dto.deviceId,
      dto.requestedAmountKg,
    );
  }
}
