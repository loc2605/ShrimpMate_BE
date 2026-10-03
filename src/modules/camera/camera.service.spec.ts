import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CameraService } from './camera.service';
import { CameraAiEngineService } from './camera-ai-engine.service';
import { CameraFisLog } from '../../database/entities/camera-fis-log.entity';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FeedingRecord } from '../../database/entities/feeding-record.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { AlertsService } from '../alerts/alerts.service';
import { AppetiteLevel, DeviceStatus, DeviceType, UserRole } from '../../database/entities/enums';
import { User } from '../../database/entities/user.entity';

describe('CameraService', () => {
  let service: CameraService;
  let fisLogRepo: any;
  let deviceRepo: any;
  let pondRepo: any;
  let alertsService: any;

  const mockUser: User = {
    id: 'user-1',
    email: 'farmer@shrimpmate.com',
    fullName: 'Farmer Joe',
    role: UserRole.FARMER,
  } as unknown as User;

  beforeEach(async () => {
    fisLogRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((dto) => ({ id: 'fis-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'fis-1', ...entity })),
    };

    deviceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    pondRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'pond-1', name: 'Ao Nuoi 1' }),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    alertsService = {
      createAlert: jest.fn().mockResolvedValue({ id: 'alert-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraService,
        CameraAiEngineService,
        {
          provide: getRepositoryToken(CameraFisLog),
          useValue: fisLogRepo,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: deviceRepo,
        },
        {
          provide: getRepositoryToken(Pond),
          useValue: pondRepo,
        },
        {
          provide: getRepositoryToken(FeedingRecord),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: PondAccessService,
          useValue: {
            ensureCanAccess: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AlertsService,
          useValue: alertsService,
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<CameraService>(CameraService);
  });

  it('should analyze frame, calculate FIS, save log and update camera status to ONLINE', async () => {
    const mockCamera = {
      id: 'cam-1',
      pondId: 'pond-1',
      name: 'Camera Sàng 1',
      type: DeviceType.CAMERA,
      status: DeviceStatus.OFFLINE,
      metadata: {},
    };
    deviceRepo.findOne.mockResolvedValue(mockCamera);

    const result = await service.analyzeFrame(
      {
        pondId: 'pond-1',
        deviceId: 'cam-1',
        simulatedMetrics: {
          remainingFeedAreaRt: 0.2,
          shrimpDensityDt: 15,
          behaviorClassificationCt: 2,
        },
      },
      mockUser,
    );

    expect(result.success).toBe(true);
    expect(result.data.pondId).toBe('pond-1');
    expect(result.analysisSummary.appetiteLevel).toBeDefined();
    expect(deviceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cam-1',
        status: DeviceStatus.ONLINE,
      }),
    );
  });

  it('should trigger an alert when an anomaly is detected during frame analysis', async () => {
    const mockCamera = {
      id: 'cam-1',
      pondId: 'pond-1',
      type: DeviceType.CAMERA,
      metadata: {},
    };
    deviceRepo.findOne.mockResolvedValue(mockCamera);

    await service.analyzeFrame(
      {
        pondId: 'pond-1',
        deviceId: 'cam-1',
        simulatedMetrics: {
          remainingFeedAreaRt: 0.9, // 90% food remaining
          shrimpDensityDt: 0.2, // 0 shrimps
          behaviorClassificationCt: 0,
        },
      },
      mockUser,
    );

    expect(alertsService.createAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        pondId: 'pond-1',
        type: 'CAMERA_FEEDING_ANOMALY',
      }),
    );
  });

  it('should return the latest FIS status for a pond', async () => {
    fisLogRepo.findOne.mockResolvedValue({
      id: 'fis-1',
      pondId: 'pond-1',
      fisScore: 0.85,
      appetiteLevel: AppetiteLevel.STRONG,
      remainingFeedAreaRt: 0.15,
      shrimpDensityDt: 20,
      feedConsumptionVelocityVt: 0.015,
      timestamp: new Date(),
      device: { id: 'cam-1', name: 'Camera 1', status: DeviceStatus.ONLINE },
    });

    const result = await service.getLatestFis('pond-1', mockUser);

    expect(result.hasData).toBe(true);
    expect(result.status?.appetiteLevel).toBe(AppetiteLevel.STRONG);
    expect(result.status?.fisScore).toBe(0.85);
  });
});
