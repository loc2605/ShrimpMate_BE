import { AlertSeverity } from '../../../database/entities/enums';

export interface ParameterThreshold {
  name: string;
  unit: string;
  optimalMin?: number;
  optimalMax?: number;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
}

export interface ThresholdViolation {
  parameter: string;
  name: string;
  unit: string;
  currentValue: number;
  severity: AlertSeverity;
  alertType: string;
  message: string;
}

export const WATER_QUALITY_THRESHOLDS: Record<string, ParameterThreshold> = {
  ph: {
    name: 'Độ pH',
    unit: '',
    optimalMin: 7.5,
    optimalMax: 8.5,
    warningMin: 7.2,
    warningMax: 8.8,
    criticalMin: 7.0,
    criticalMax: 9.0,
  },
  dissolvedOxygenMgL: {
    name: 'Oxy hòa tan (DO)',
    unit: 'mg/L',
    optimalMin: 5.0,
    optimalMax: 12.0,
    warningMin: 4.0,
    criticalMin: 3.5,
  },
  temperatureC: {
    name: 'Nhiệt độ nước',
    unit: '°C',
    optimalMin: 28.0,
    optimalMax: 32.0,
    warningMin: 26.0,
    warningMax: 33.5,
    criticalMin: 22.0,
    criticalMax: 35.0,
  },
  salinityPpt: {
    name: 'Độ mặn',
    unit: 'ppt',
    optimalMin: 10.0,
    optimalMax: 25.0,
    warningMin: 5.0,
    warningMax: 30.0,
    criticalMin: 2.0,
    criticalMax: 35.0,
  },
  ammoniaMgL: {
    name: 'Khí độc Ammonia (NH3/TAN)',
    unit: 'mg/L',
    optimalMin: 0.0,
    optimalMax: 0.05,
    warningMax: 0.1,
    criticalMax: 0.3,
  },
  turbidityNtu: {
    name: 'Độ đục',
    unit: 'NTU',
    optimalMin: 20.0,
    optimalMax: 40.0,
    warningMax: 60.0,
    criticalMax: 80.0,
  },
};
