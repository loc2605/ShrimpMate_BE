import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SafetyRule } from '../../database/entities/safety-rule.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { PondAccessModule } from '../../common/guards/pond-access.module';
import { SafetyRuleController } from './safety-rule.controller';
import { SafetyRuleService } from './safety-rule.service';
import { SafetyRuleEngineService } from './safety-rule-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SafetyRule, TelemetryReading, Device, Pond]),
    PondAccessModule,
  ],
  controllers: [SafetyRuleController],
  providers: [SafetyRuleService, SafetyRuleEngineService],
  exports: [SafetyRuleService, SafetyRuleEngineService],
})
export class SafetyRuleModule {}
