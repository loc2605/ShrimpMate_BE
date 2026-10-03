import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CameraAiEngineService } from './camera-ai-engine.service';
import { AppetiteLevel } from '../../database/entities/enums';

describe('CameraAiEngineService', () => {
  let service: CameraAiEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraAiEngineService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<CameraAiEngineService>(CameraAiEngineService);
  });

  it('should calculate FIS and determine STRONG appetite level correctly', () => {
    // When food area is low (Rt=0.1 => high consumed), consumption speed is high, shrimp density is high, behavior is strong (Ct=3)
    const result = service.calculateFis({
      remainingFeedAreaRt: 0.1,
      shrimpDensityDt: 25,
      behaviorClassificationCt: 3,
      previousRt: 0.6,
      timeDeltaSeconds: 20,
    });

    expect(result.fisScore).toBeGreaterThan(0.7);
    expect(result.appetiteLevel).toBe(AppetiteLevel.STRONG);
    expect(result.normalized.normalizedRt).toBeCloseTo(0.9, 1);
    expect(result.isAnomaly).toBe(false);
  });

  it('should calculate FIS and determine NONE appetite level and detect food stagnation anomaly', () => {
    // When food remaining is high (Rt=0.85), shrimp density is near zero (Dt=0), behavior is none (Ct=0)
    const result = service.calculateFis({
      remainingFeedAreaRt: 0.85,
      shrimpDensityDt: 0.5,
      behaviorClassificationCt: 0,
      previousRt: 0.85,
      timeDeltaSeconds: 20,
    });

    expect(result.fisScore).toBeLessThan(0.25);
    expect(result.appetiteLevel).toBe(AppetiteLevel.NONE);
    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyReason).toContain('Thức ăn dư thừa');
  });

  it('should run parallel dual-stream AI inference without errors', async () => {
    const result = await service.processFrameParallel(
      undefined,
      undefined,
      { x: 100, y: 100, width: 400, height: 400 },
      0.5,
      20,
      undefined,
      {
        remainingFeedAreaRt: 0.3,
        shrimpDensityDt: 12,
        behaviorClassificationCt: 2,
      },
    );

    expect(result).toBeDefined();
    expect(result.fisScore).toBeGreaterThanOrEqual(0);
    expect(result.fisScore).toBeLessThanOrEqual(1);
    expect([
      AppetiteLevel.NONE,
      AppetiteLevel.WEAK,
      AppetiteLevel.NORMAL,
      AppetiteLevel.STRONG,
    ]).toContain(result.appetiteLevel);
  });
});
