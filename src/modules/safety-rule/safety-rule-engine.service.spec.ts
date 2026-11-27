import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SafetyRuleEngineService } from './safety-rule-engine.service';
import { SafetyRule } from '../../database/entities/safety-rule.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { Device } from '../../database/entities/device.entity';
import { DeviceMode, DeviceStatus, DeviceType, SafetyDecision } from '../../database/entities/enums';

describe('SafetyRuleEngineService', () => {
  let service: SafetyRuleEngineService;
  let ruleRepository: any;
  let readingRepository: any;
  let deviceRepository: any;

  beforeEach(async () => {
    ruleRepository = {
      find: jest.fn(),
    };
    readingRepository = {
      find: jest.fn(),
    };
    deviceRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyRuleEngineService,
        {
          provide: getRepositoryToken(SafetyRule),
          useValue: ruleRepository,
        },
        {
          provide: getRepositoryToken(TelemetryReading),
          useValue: readingRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: deviceRepository,
        },
      ],
    }).compile();

    service = module.get<SafetyRuleEngineService>(SafetyRuleEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateFeedingSafety', () => {
    const mockPondId = 'pond-01';

    it('should BLOCK feeding when pond has no telemetry data (NO_TELEMETRY_DATA)', async () => {
      readingRepository.find!.mockResolvedValue([]);
      ruleRepository.find!.mockResolvedValue([]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 10.0);

      expect(result.decision).toBe(SafetyDecision.BLOCKED);
      expect(result.allowedAmountKg).toBe(0);
      expect(result.appliedRules).toContain('NO_TELEMETRY_DATA');
    });

    it('should BLOCK feeding when sensor data is stale (> 30 mins) (STALE_SENSOR_DATA)', async () => {
      const staleDate = new Date(Date.now() - 45 * 60 * 1000); // 45 phút trước
      readingRepository.find!.mockResolvedValue([
        {
          id: 'reading-1',
          pondId: mockPondId,
          dissolvedOxygenMgL: 6.0,
          measuredAt: staleDate,
        } as any,
      ]);
      ruleRepository.find!.mockResolvedValue([]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 10.0);

      expect(result.decision).toBe(SafetyDecision.BLOCKED);
      expect(result.allowedAmountKg).toBe(0);
      expect(result.appliedRules).toContain('STALE_SENSOR_DATA');
    });

    it('should BLOCK feeding when DO rule triggers BLOCKED action', async () => {
      const freshDate = new Date();
      readingRepository.find!.mockResolvedValue([
        {
          id: 'reading-1',
          pondId: mockPondId,
          dissolvedOxygenMgL: 2.8,
          measuredAt: freshDate,
        } as any,
      ]);

      const mockDoRule: Partial<SafetyRule> = {
        code: 'DO_CRITICAL_LOW',
        name: 'Oxy hòa tan nguy cấp',
        isEnabled: true,
        priority: 1,
        condition: {
          field: 'dissolvedOxygenMgL',
          operator: '<',
          value: 3.5,
        },
        action: {
          decision: 'blocked',
          reason: 'Oxy hòa tan quá thấp (< 3.5 mg/L), cấm cho ăn!',
        },
      };

      ruleRepository.find!.mockResolvedValue([mockDoRule as SafetyRule]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 10.0);

      expect(result.decision).toBe(SafetyDecision.BLOCKED);
      expect(result.allowedAmountKg).toBe(0);
      expect(result.appliedRules).toContain('DO_CRITICAL_LOW');
    });

    it('should not stack the predictive DO reduction on a configured DO adjustment', async () => {
      const freshDate = new Date();
      readingRepository.find!.mockResolvedValue([
        {
          id: 'reading-1',
          pondId: mockPondId,
          dissolvedOxygenMgL: 3.5,
          measuredAt: freshDate,
        } as any,
      ]);

      const mockAdjustRule: Partial<SafetyRule> = {
        code: 'DO_LOW_ADJUST',
        name: 'Oxy hòa tan thấp',
        isEnabled: true,
        priority: 2,
        condition: {
          field: 'dissolvedOxygenMgL',
          operator: '<',
          value: 4.0,
        },
        action: {
          decision: 'adjusted',
          factor: 0.5,
          reason: 'Oxy hòa tan thấp (3.5 - 4.0 mg/L), giảm 50% thức ăn!',
        },
      };

      ruleRepository.find!.mockResolvedValue([mockAdjustRule as SafetyRule]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 50.0);

      expect(result.decision).toBe(SafetyDecision.ADJUSTED);
      expect(result.allowedAmountKg).toBe(25.0);
      expect(result.appliedRules).toContain('DO_LOW_ADJUST');
      expect(result.appliedRules).not.toContain('ADAPTIVE_FEEDING_PREDICTED_DO_DROP');
      expect(result.contextSnapshot?.isAdaptiveAdjusted).toBe(false);
    });

    it('calculates deltaTan from TAN readings rather than ammonia readings', async () => {
      const now = Date.now();
      readingRepository.find!.mockResolvedValue([
        {
          id: 'reading-1',
          pondId: mockPondId,
          dissolvedOxygenMgL: 6.5,
          ammoniaMgL: 0.1,
          tanMgL: 0.4,
          measuredAt: new Date(now),
        },
        {
          id: 'reading-2',
          pondId: mockPondId,
          dissolvedOxygenMgL: 6.5,
          ammoniaMgL: 0.8,
          tanMgL: 0.2,
          measuredAt: new Date(now - 5 * 60 * 1000),
        },
      ] as any);
      ruleRepository.find!.mockResolvedValue([]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 8.0);

      expect(result.contextSnapshot?.deltaTan).toBe(0.2);
    });

    it('should clamp predicted DO values between 0.0 and 15.0 mg/L even with extreme slope', async () => {
      const now = Date.now();
      // Giả lập 2 mẫu đo cách nhau 10 giây nhưng chênh lệch DO lớn
      const reading1 = {
        id: 'reading-1',
        pondId: mockPondId,
        dissolvedOxygenMgL: 14.0,
        measuredAt: new Date(now),
      };
      const reading2 = {
        id: 'reading-2',
        pondId: mockPondId,
        dissolvedOxygenMgL: 2.0,
        measuredAt: new Date(now - 10 * 1000),
      };

      readingRepository.find!.mockResolvedValue([reading1 as any, reading2 as any]);
      ruleRepository.find!.mockResolvedValue([]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 5.0);

      expect(result.contextSnapshot?.predictedDo1h).toBeDefined();
      expect(result.contextSnapshot?.predictedDo2h).toBeDefined();
      expect(result.contextSnapshot!.predictedDo1h!).toBeLessThanOrEqual(15.0);
      expect(result.contextSnapshot!.predictedDo1h!).toBeGreaterThanOrEqual(0.0);
      expect(result.contextSnapshot!.predictedDo2h!).toBeLessThanOrEqual(15.0);
      expect(result.contextSnapshot!.predictedDo2h!).toBeGreaterThanOrEqual(0.0);
    });

    it('should trigger ADAPTIVE_FEEDING when current DO is safe but predicted to drop below 3.2 mg/L', async () => {
      const now = Date.now();
      // Hiện tại DO = 3.6 (an toàn), nhưng cữ trước DO = 5.6 (đang tụt nhanh -2.0 mg/L/h)
      const reading1 = {
        id: 'reading-1',
        pondId: mockPondId,
        dissolvedOxygenMgL: 3.6,
        measuredAt: new Date(now),
      };
      const reading2 = {
        id: 'reading-2',
        pondId: mockPondId,
        dissolvedOxygenMgL: 5.6,
        measuredAt: new Date(now - 3600 * 1000), // 1 giờ trước
      };

      readingRepository.find!.mockResolvedValue([reading1 as any, reading2 as any]);
      ruleRepository.find!.mockResolvedValue([]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 10.0);

      expect(result.decision).toBe(SafetyDecision.ADJUSTED);
      expect(result.appliedRules).toContain('ADAPTIVE_FEEDING_PREDICTED_DO_DROP');
      expect(result.allowedAmountKg).toBe(6.0); // Giảm 40% còn 6kg
    });

    it('should ALLOW feeding when all water parameters are optimal and feeder is normal', async () => {
      const now = new Date();
      readingRepository.find!.mockResolvedValue([
        {
          id: 'reading-1',
          pondId: mockPondId,
          dissolvedOxygenMgL: 6.5,
          ph: 7.8,
          temperatureC: 28.5,
          salinityPpt: 15.0,
          ammoniaMgL: 0.1,
          measuredAt: now,
        } as any,
      ]);
      ruleRepository.find!.mockResolvedValue([]);

      const result = await service.evaluateFeedingSafety(mockPondId, undefined, 8.0);

      expect(result.decision).toBe(SafetyDecision.ALLOWED);
      expect(result.allowedAmountKg).toBe(8.0);
      expect(result.reasons).toEqual([]);
    });
  });
});
