import { normalizeMqttTelemetryTimestamp } from './mqtt.service';

describe('normalizeMqttTelemetryTimestamp', () => {
  const receivedAt = new Date('2026-11-27T15:36:10.000Z');

  it('uses backend receive time when a live device clock is significantly behind', () => {
    const rawData = { humidityPercent: 40 };
    const result = normalizeMqttTelemetryTimestamp(
      '2026-11-27T22:27:40+07:00',
      rawData,
      receivedAt,
      false,
    );

    expect(result.measuredAt).toBe(receivedAt.toISOString());
    expect(result.adjusted).toBe(true);
    expect(result.clockSkewMs).toBe(510000);
    expect(result.rawData).toEqual({
      humidityPercent: 40,
      timestampDiagnostics: {
        reportedMeasuredAt: '2026-11-27T22:27:40+07:00',
        receivedAt: receivedAt.toISOString(),
        clockSkewMs: 510000,
        adjusted: true,
      },
    });
  });

  it('preserves a live device timestamp when it is within the allowed clock skew', () => {
    const measuredAt = '2026-11-27T15:35:40.000Z';
    const result = normalizeMqttTelemetryTimestamp(
      measuredAt,
      undefined,
      receivedAt,
      false,
    );

    expect(result.measuredAt).toBe(measuredAt);
    expect(result.rawData).toEqual({});
    expect(result.adjusted).toBe(false);
  });

  it('preserves the original timestamp of buffered telemetry', () => {
    const measuredAt = '2026-11-27T22:27:40+07:00';
    const result = normalizeMqttTelemetryTimestamp(
      measuredAt,
      undefined,
      receivedAt,
      true,
    );

    expect(result.measuredAt).toBe(measuredAt);
    expect(result.adjusted).toBe(false);
  });

  it('replaces an invalid live device timestamp with backend receive time', () => {
    const result = normalizeMqttTelemetryTimestamp(
      'not-a-date',
      undefined,
      receivedAt,
      false,
    );

    expect(result.measuredAt).toBe(receivedAt.toISOString());
    expect(result.adjusted).toBe(true);
    expect(result.clockSkewMs).toBeNull();
  });
});
