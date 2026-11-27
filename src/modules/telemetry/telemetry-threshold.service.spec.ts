import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alert } from '../../database/entities/alert.entity';
import { Device } from '../../database/entities/device.entity';
import { TelemetryReading } from '../../database/entities/telemetry-reading.entity';
import { AlertSeverity } from '../../database/entities/enums';
import { AlertCooldownService } from '../alerts/alert-cooldown.service';
import { AlertsService } from '../alerts/alerts.service';
import { TelemetryThresholdService } from './telemetry-threshold.service';

describe('TelemetryThresholdService QCVN water limits', () => {
  let service: TelemetryThresholdService;
  let dailyPhQuery: {
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getRawOne: jest.Mock;
  };
  let alertCooldownService: { acquireAlertLock: jest.Mock };

  beforeEach(async () => {
    dailyPhQuery = {
      select: jest.fn(),
      addSelect: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      getRawOne: jest.fn().mockResolvedValue({ minPh: '7', maxPh: '7' }),
    };
    dailyPhQuery.select.mockReturnValue(dailyPhQuery);
    dailyPhQuery.addSelect.mockReturnValue(dailyPhQuery);
    dailyPhQuery.where.mockReturnValue(dailyPhQuery);
    dailyPhQuery.andWhere.mockReturnValue(dailyPhQuery);
    alertCooldownService = {
      acquireAlertLock: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryThresholdService,
        { provide: getRepositoryToken(Alert), useValue: {} },
        {
          provide: getRepositoryToken(TelemetryReading),
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(dailyPhQuery) },
        },
        { provide: getRepositoryToken(Device), useValue: {} },
        { provide: AlertsService, useValue: { createAlert: jest.fn().mockResolvedValue({}) } },
        { provide: AlertCooldownService, useValue: alertCooldownService },
      ],
    }).compile();

    service = module.get<TelemetryThresholdService>(TelemetryThresholdService);
  });

  it('uses QCVN boundary conditions for DO, temperature, salinity, and NH3', async () => {
    const reading = {
      id: 'reading-1',
      pondId: 'pond-1',
      deviceId: null,
      measuredAt: new Date(),
      ph: 7,
      dissolvedOxygenMgL: 3.49,
      temperatureC: 33.01,
      salinityPpt: 4.99,
      ammoniaMgL: 0.3,
      turbidityNtu: null,
      rawData: {},
      isBuffered: false,
    } as TelemetryReading;

    const violations = await service.checkThresholds(reading);
    const criticalTypes = violations
      .filter((violation) => violation.severity === AlertSeverity.CRITICAL)
      .map((violation) => violation.alertType);

    expect(criticalTypes).toEqual(
      expect.arrayContaining([
        'CRITICAL_DO_LOW',
        'CRITICAL_TEMPERATURE',
        'CRITICAL_SALINITY',
        'CRITICAL_AMMONIA_HIGH',
      ]),
    );
  });

  it('alerts when the daily pH variation exceeds 0.5', async () => {
    dailyPhQuery.getRawOne.mockResolvedValue({ minPh: '7', maxPh: '7.6' });
    const reading = {
      id: 'reading-2',
      pondId: 'pond-1',
      deviceId: null,
      measuredAt: new Date(),
      ph: 7.6,
      dissolvedOxygenMgL: null,
      temperatureC: null,
      salinityPpt: null,
      ammoniaMgL: null,
      turbidityNtu: null,
      rawData: {},
      isBuffered: false,
    } as TelemetryReading;

    const violations = await service.checkThresholds(reading);

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ alertType: 'WARNING_PH_DAILY_VARIATION', currentValue: 0.6 }),
      ]),
    );
  });
});
