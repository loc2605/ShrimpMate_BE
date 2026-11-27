import { AlertSeverity } from '../../../database/entities/enums';
import { QCVN_02_19_WATER_LIMITS } from '../../../common/constants/qcvn-02-19.constants';

// critical bounds follow QCVN where the measured parameter and unit match;
// warning and optimal bounds are additional project heuristics.
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
    criticalMin: QCVN_02_19_WATER_LIMITS.ph.min,
    criticalMax: QCVN_02_19_WATER_LIMITS.ph.max,
  },
  dissolvedOxygenMgL: {
    name: 'Oxy hòa tan (DO)',
    unit: 'mg/L',
    optimalMin: 5.0,
    optimalMax: 12.0,
    warningMin: 4.0,
    criticalMin: QCVN_02_19_WATER_LIMITS.dissolvedOxygenMgL.min,
  },
  temperatureC: {
    name: 'Nhiệt độ nước',
    unit: '°C',
    optimalMin: 28.0,
    optimalMax: 32.0,
    warningMin: 28.0,
    warningMax: 32.0,
    criticalMin: QCVN_02_19_WATER_LIMITS.temperatureC.min,
    criticalMax: QCVN_02_19_WATER_LIMITS.temperatureC.max,
  },
  salinityPpt: {
    name: 'Độ mặn',
    unit: 'ppt',
    optimalMin: 10.0,
    optimalMax: 25.0,
    warningMin: 10.0,
    warningMax: 30.0,
    criticalMin: QCVN_02_19_WATER_LIMITS.salinityPpt.min,
    criticalMax: QCVN_02_19_WATER_LIMITS.salinityPpt.max,
  },
  ammoniaMgL: {
    name: 'Ammonia (NH3)',
    unit: 'mg/L',
    optimalMin: 0.0,
    optimalMax: 0.05,
    warningMax: 0.1,
    criticalMax: QCVN_02_19_WATER_LIMITS.ammoniaMgL.maxExclusive,
  },
  turbidityNtu: {
    // QCVN specifies water transparency in cm, not turbidity in NTU.
    name: 'Độ đục',
    unit: 'NTU',
    optimalMin: 20.0,
    optimalMax: 40.0,
    warningMax: 60.0,
    criticalMax: 80.0,
  },
};
