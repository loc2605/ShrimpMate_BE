export const QCVN_02_19_REFERENCE =
  'QCVN 02-19:2014/BNNPTNT, Phu luc I, Bang 1';

export const QCVN_02_19_WATER_LIMITS = {
  dissolvedOxygenMgL: { min: 3.5 },
  ph: { min: 7.0, max: 9.0, maxDailyVariation: 0.5 },
  temperatureC: { min: 18.0, max: 33.0 },
  salinityPpt: { min: 5.0, max: 35.0 },
  ammoniaMgL: { maxExclusive: 0.3 },
  // The telemetry API currently measures turbidity in NTU, so this is not directly comparable.
  transparencyCm: { min: 20.0, max: 50.0 },
} as const;
