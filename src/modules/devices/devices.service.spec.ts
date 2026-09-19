import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { DeviceMode, DeviceStatus, DeviceType } from '../../database/entities/enums';
import { PondAccessService } from '../../common/guards/pond-access.service';
import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceRepository: any;
  let pondRepository: any;
  let pondAccessService: any;

  beforeEach(async () => {
    deviceRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    pondRepository = {
      findOne: jest.fn(),
    };

    pondAccessService = {
      ensureCanAccess: jest.fn(),
      findAssignedPondIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: getRepositoryToken(Device),
          useValue: deviceRepository,
        },
        {
          provide: getRepositoryToken(Pond),
          useValue: pondRepository,
        },
        {
          provide: PondAccessService,
          useValue: pondAccessService,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('should reject duplicate device_uid when creating a device', async () => {
    deviceRepository.findOne.mockResolvedValue({ id: 'existing-device-id' });

    await expect(
      service.createDevice({
        deviceUid: 'DEVICE-001',
        name: 'Feeder A',
        type: DeviceType.FEEDER,
        status: DeviceStatus.OFFLINE,
        mode: DeviceMode.MANUAL,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when device does not exist', async () => {
    deviceRepository.findOne.mockResolvedValue(null);

    await expect(service.findDeviceById('missing-id')).rejects.toThrow(NotFoundException);
  });
});
