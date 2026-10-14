import { BadRequestException, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CameraAiEngineService } from './camera-ai-engine.service';
import { AppetiteLevel } from '../../database/entities/enums';

describe('CameraAiEngineService', () => {
  let service: CameraAiEngineService;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ai.engineUrl') return 'http://localhost:8000';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraAiEngineService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<CameraAiEngineService>(CameraAiEngineService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should calculate FIS and determine STRONG appetite level correctly', () => {
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

  it('should reject when neither frameData nor frameUrl is provided', async () => {
    await expect(
      service.processFrameParallel(undefined, undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ServiceUnavailableException when AI_ENGINE_URL is not configured', async () => {
    configService.get.mockReturnValue(null);

    await expect(
      service.processFrameParallel('base64_data_here', undefined),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('should throw BadGatewayException when AI Engine connection fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    await expect(
      service.processFrameParallel('base64_data_here', undefined),
    ).rejects.toThrow(BadGatewayException);
  });

  it('should run parallel dual-stream AI inference with real AI Engine responses', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('yolo-seg')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              remainingFeedAreaRt: 0.25,
              shrimpDensityDt: 16.5,
              shrimpMaskConfidence: 0.94,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            behaviorClassificationCt: 2,
            confidence: 0.91,
          }),
      });
    });

    const result = await service.processFrameParallel(
      'base64_frame_data',
      undefined,
      { x: 100, y: 100, width: 400, height: 400 },
      0.5,
      20,
    );

    expect(result).toBeDefined();
    expect(result.fisScore).toBeGreaterThanOrEqual(0);
    expect(result.fisScore).toBeLessThanOrEqual(1);
    expect(result.raw.remainingFeedAreaRt).toBe(0.25);
    expect(result.raw.shrimpDensityDt).toBe(16.5);
    expect(result.raw.behaviorClassificationCt).toBe(2);
  });
});
