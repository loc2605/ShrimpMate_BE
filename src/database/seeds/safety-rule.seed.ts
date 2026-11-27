import { DataSource } from 'typeorm';
import { SafetyRule } from '../entities/safety-rule.entity';
import { QCVN_02_19_WATER_LIMITS } from '../../common/constants/qcvn-02-19.constants';

export const defaultSafetyRules = [
  {
    code: 'DEVICE_STATUS_BLOCK',
    name: 'Chặn lệnh khi thiết bị lỗi hoặc dừng khẩn cấp',
    priority: 0,
    isEnabled: true,
    condition: { checkDevice: true },
    action: {
      decision: 'blocked',
      reason: 'Thiết bị máy cho ăn đang ở trạng thái lỗi hoặc dừng khẩn cấp (emergency stop).',
    },
  },
  {
    code: 'DO_BELOW_CRITICAL',
    name: 'Chặn cho ăn khi DO thấp hơn giới hạn QCVN (< 3.5 mg/L)',
    priority: 1,
    isEnabled: true,
    condition: {
      field: 'dissolvedOxygenMgL',
      operator: '<',
      value: QCVN_02_19_WATER_LIMITS.dissolvedOxygenMgL.min,
    },
    action: {
      decision: 'blocked',
      reason: 'Nồng độ oxy hòa tan (DO) quá thấp (< 3.5 mg/L). Cấm cho ăn để tránh tôm bị ngạt và dư thừa thức ăn gây ô nhiễm đáy ao.',
    },
  },
  {
    code: 'DO_LOW_ADJUST',
    name: 'Heuristic: giảm 50% thức ăn khi DO dưới 4.0 mg/L',
    priority: 2,
    isEnabled: true,
    condition: { field: 'dissolvedOxygenMgL', operator: '<', value: 4.0 },
    action: {
      decision: 'adjusted',
      factor: 0.5,
      reason: 'DO dưới 4.0 mg/L; giảm 50% lượng thức ăn theo heuristic của đề tài. Mức 4.0 mg/L là ngưỡng cảnh báo nội bộ, không phải giới hạn QCVN.',
    },
  },
  {
    code: 'TEMP_EXTREME_ADJUST',
    name: 'Heuristic: giảm 50% thức ăn khi nhiệt độ ngoài giới hạn QCVN (18 - 33°C)',
    priority: 3,
    isEnabled: true,
    condition: {
      or: [
        {
          field: 'temperatureC',
          operator: '<',
          value: QCVN_02_19_WATER_LIMITS.temperatureC.min,
        },
        {
          field: 'temperatureC',
          operator: '>',
          value: QCVN_02_19_WATER_LIMITS.temperatureC.max,
        },
      ],
    },
    action: {
      decision: 'adjusted',
      factor: 0.5,
      reason: 'Nhiệt độ ngoài giới hạn QCVN 18 - 33°C; giảm 50% lượng thức ăn theo heuristic của đề tài.',
    },
  },
  {
    code: 'PH_CRITICAL_BLOCK',
    name: 'Chặn cho ăn khi pH ngoài giới hạn QCVN (7.0 - 9.0)',
    priority: 4,
    isEnabled: true,
    condition: {
      or: [
        { field: 'ph', operator: '<', value: QCVN_02_19_WATER_LIMITS.ph.min },
        { field: 'ph', operator: '>', value: QCVN_02_19_WATER_LIMITS.ph.max },
      ],
    },
    action: {
      decision: 'blocked',
      reason: 'Độ pH nước nằm ngoài ngưỡng sinh lý an toàn (< 7.0 hoặc > 9.0). Tạm dừng cho ăn để ổn định môi trường.',
    },
  },
  {
    code: 'AMMONIA_HIGH_BLOCK',
    name: 'Chặn cho ăn khi NH3 đạt hoặc vượt giới hạn QCVN (0.3 mg/L)',
    priority: 5,
    isEnabled: true,
    condition: {
      field: 'ammoniaMgL',
      operator: '>=',
      value: QCVN_02_19_WATER_LIMITS.ammoniaMgL.maxExclusive,
    },
    action: {
      decision: 'blocked',
      reason: 'NH3 phải thấp hơn 0.3 mg/L theo QCVN. Cấm cho ăn theo chính sách an toàn của đề tài.',
    },
  },
  {
    code: 'DELTA_TAN_SPIKE_ADJUST',
    name: 'Heuristic: giảm 50% thức ăn khi biến thiên ammonia > 0.5 mg/L',
    priority: 6,
    isEnabled: true,
    condition: { field: 'deltaTan', operator: '>', value: 0.5 },
    action: {
      decision: 'adjusted',
      factor: 0.5,
      reason: 'Biến thiên ammonia > 0.5 mg/L; giảm 50% lượng thức ăn theo heuristic của đề tài, không phải ngưỡng QCVN.',
    },
  },
  {
    code: 'HEAVY_RAIN_ADJUST',
    name: 'Heuristic: giảm 30% thức ăn khi mưa sáng sớm (≥ 15 mm)',
    priority: 7,
    isEnabled: true,
    condition: { field: 'morningRainMm', operator: '>=', value: 15.0 },
    action: {
      decision: 'adjusted',
      factor: 0.7,
      reason: 'Mưa sáng sớm ≥ 15 mm; giảm 30% lượng thức ăn theo heuristic của đề tài, không phải ngưỡng QCVN.',
    },
  },
];

export async function seedSafetyRuleData(dataSource: DataSource) {
  const safetyRuleRepository = dataSource.getRepository(SafetyRule);

  for (const ruleData of defaultSafetyRules) {
    const existing = await safetyRuleRepository.findOne({ where: { code: ruleData.code } });
    if (!existing) {
      const rule = safetyRuleRepository.create(ruleData);
      await safetyRuleRepository.save(rule);
    }
  }
}
