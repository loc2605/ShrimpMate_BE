const assert = require('node:assert/strict');
const mqtt = require('mqtt');

const BASE_URL = process.env.SHRIMPMATE_BASE_URL || 'http://127.0.0.1:3000';
const ACCESS_TOKEN = process.env.SHRIMPMATE_TEST_TOKEN;
const FEEDER_UID = process.env.SHRIMPMATE_TEST_FEEDER_UID;
const EXPECTED_POND_ID = process.env.SHRIMPMATE_TEST_POND_ID;
const MQTT_URL = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
const ALLOW_SIMULATED_FEED = process.env.SHRIMPMATE_ALLOW_SIMULATED_FEED === 'true';
const TEST_FEED_AMOUNT_KG = 0.1;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, path, body) {
  const response = await fetch(new URL(path, BASE_URL), {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with HTTP ${response.status}: ${text}`);
  }
  return { status: response.status, data };
}

function getRows(response) {
  return Array.isArray(response) ? response : response?.data ?? response?.items ?? [];
}

function waitForMessage(messages, predicate, timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const match = messages.find(predicate);
      if (match) return resolve(match);
      if (Date.now() - startedAt >= timeoutMs) {
        return reject(new Error(`Timed out waiting for MQTT message after ${timeoutMs} ms`));
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}

function telemetryBody(testCaseId, values) {
  return {
    ...values,
    measuredAt: new Date().toISOString(),
    rawData: {
      rainMm: 0,
      waterChangeM3: 0,
      testCaseId,
    },
  };
}

async function main() {
  assert.ok(ACCESS_TOKEN, 'Set SHRIMPMATE_TEST_TOKEN to a valid access token.');
  assert.ok(FEEDER_UID, 'Set SHRIMPMATE_TEST_FEEDER_UID to the simulator UID.');

  const devicesResponse = await request('GET', '/devices');
  const device = getRows(devicesResponse.data).find((item) => item.deviceUid === FEEDER_UID);
  assert.ok(device, `No registered device found for UID ${FEEDER_UID}.`);
  assert.equal(device.type, 'feeder', `${FEEDER_UID} is not registered as a feeder.`);

  const pondId = EXPECTED_POND_ID || device.pondId;
  assert.ok(pondId, `No pond is assigned to feeder ${FEEDER_UID}.`);
  assert.equal(device.pondId, pondId, 'The feeder must be assigned to the selected pond.');
  assert.equal(device.status, 'online', `Feeder ${FEEDER_UID} is not online.`);
  assert.notEqual(device.mode, 'emergency_stop', 'Feeder is in emergency-stop mode.');

  const seasonsResponse = await request('GET', `/ponds/${pondId}/crop-seasons`);
  assert.ok(
    getRows(seasonsResponse.data).some((season) => season.status === 'active'),
    `Pond ${pondId} has no active crop season.`,
  );

  const telemetryTopic = `shrimpmate/telemetry/${FEEDER_UID}`;
  const commandTopic = `shrimpmate/devices/${FEEDER_UID}/feeder/command`;
  const statusTopic = `shrimpmate/devices/${FEEDER_UID}/feeder/status`;
  const messages = [];
  const client = mqtt.connect(MQTT_URL, { connectTimeout: 5000, reconnectPeriod: 0 });
  let restoreTelemetry = false;

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MQTT connection timed out.')), 7000);
      client.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    client.on('message', (topic, message) => {
      try {
        messages.push({ topic, payload: JSON.parse(message.toString()) });
      } catch {
        messages.push({ topic, payload: message.toString() });
      }
    });
    await new Promise((resolve, reject) => {
      client.subscribe([telemetryTopic, commandTopic, statusTopic], (error) =>
        error ? reject(error) : resolve(),
      );
    });

    const historyBefore = await request(
      'GET',
      `/ponds/${pondId}/telemetry/history?limit=1&page=1`,
    );
    const telemetryMessage = await waitForMessage(
      messages,
      (message) => message.topic === telemetryTopic && message.payload.deviceUid === FEEDER_UID,
      20000,
    );
    assert.ok(Number.isFinite(Number(telemetryMessage.payload.tanMgL)), 'Simulator did not send tanMgL.');
    assert.ok(
      Number.isFinite(Number(telemetryMessage.payload.ammoniaMgL)),
      'Simulator did not send ammoniaMgL.',
    );

    const historyAfter = await request(
      'GET',
      `/ponds/${pondId}/telemetry/history?limit=1&page=1`,
    );
    assert.ok(
      historyAfter.data.total > historyBefore.data.total,
      'MQTT telemetry was received, but no new telemetry row was stored by the backend.',
    );
    console.log(
      `IOT PASS: MQTT telemetry stored; measuredAt=${telemetryMessage.payload.measuredAt}; ` +
        `NH3=${telemetryMessage.payload.ammoniaMgL}; TAN=${telemetryMessage.payload.tanMgL}`,
    );

    const prediction = await request('POST', `/ponds/${pondId}/ai/predict-feed`, {});
    assert.ok(Number.isFinite(Number(prediction.data.predictedFeedAmountKg)));
    console.log(
      `AI PASS: model=${prediction.data.modelName}; ` +
        `predictedKg=${prediction.data.predictedFeedAmountKg}; safety=${prediction.data.safetyDecision}`,
    );

    const blockTestId = `e2e-block-${Date.now()}`;
    restoreTelemetry = true;
    const badTelemetry = await request(
      'POST',
      `/ponds/${pondId}/telemetry`,
      telemetryBody(blockTestId, {
        ph: 6.1,
        dissolvedOxygenMgL: 2.8,
        temperatureC: 28.5,
        salinityPpt: 18.5,
        ammoniaMgL: 0.02,
        tanMgL: 0.2,
        turbidityNtu: 12,
      }),
    );
    assert.ok(badTelemetry.data.violationsCount > 0, 'Unsafe telemetry produced no violations.');

    const latestBeforeEvaluation = await request('GET', `/ponds/${pondId}/telemetry/latest`);
    assert.equal(
      latestBeforeEvaluation.data.rawData?.testCaseId,
      blockTestId,
      'A newer simulator sample replaced the unsafe test reading; aborting before feed request.',
    );

    const evaluation = await request(
      'POST',
      `/ponds/${pondId}/safety-rules/evaluate`,
      { deviceId: device.id, requestedAmountKg: TEST_FEED_AMOUNT_KG },
    );
    assert.equal(
      String(evaluation.data.decision).toLowerCase(),
      'blocked',
      'Safety evaluation did not block the unsafe test sample.',
    );

    const latestBeforeBlockedFeed = await request('GET', `/ponds/${pondId}/telemetry/latest`);
    assert.equal(
      latestBeforeBlockedFeed.data.rawData?.testCaseId,
      blockTestId,
      'Unsafe test reading was replaced before the blocked-feed request; aborting safely.',
    );

    const blockedFeed = await request('POST', `/ponds/${pondId}/feeding-records`, {
      requestedAmountKg: TEST_FEED_AMOUNT_KG,
      source: 'manual',
      deviceId: device.id,
    });
    assert.equal(String(blockedFeed.data.safetyDecision).toLowerCase(), 'blocked');
    assert.equal(String(blockedFeed.data.status).toLowerCase(), 'stopped');
    assert.equal(Number(blockedFeed.data.actualAmountKg), 0);
    await wait(500);
    assert.ok(
      !messages.some(
        (message) =>
          message.topic === commandTopic && message.payload.recordId === blockedFeed.data.id,
      ),
      'A FEED command was published for a safety-blocked record.',
    );
    const alertResponse = await request(
      'GET',
      `/ponds/${pondId}/alerts?limit=20&page=1`,
    );
    assert.ok(
      getRows(alertResponse.data).some((alert) => alert.type === 'FEEDING_SAFETY_BLOCKED'),
      'The safety-blocked feed did not create its alert.',
    );
    console.log(
      `BLOCK PASS: record=${blockedFeed.data.id}; status=stopped; ` +
        'actualKg=0; alert=present; matching MQTT FEED command=none.',
    );

    const goodTestId = `e2e-restore-${Date.now()}`;
    await request(
      'POST',
      `/ponds/${pondId}/telemetry`,
      telemetryBody(goodTestId, {
        ph: 7.8,
        dissolvedOxygenMgL: 6.8,
        temperatureC: 28.5,
        salinityPpt: 18.5,
        ammoniaMgL: 0.02,
        tanMgL: 0.2,
        turbidityNtu: 12,
      }),
    );
    restoreTelemetry = false;

    if (!ALLOW_SIMULATED_FEED) {
      console.log(
        'SAFE FEED SKIPPED: set SHRIMPMATE_ALLOW_SIMULATED_FEED=true only when this UID is a simulator.',
      );
      return;
    }

    const safeEvaluation = await request(
      'POST',
      `/ponds/${pondId}/safety-rules/evaluate`,
      { deviceId: device.id, requestedAmountKg: TEST_FEED_AMOUNT_KG },
    );
    assert.notEqual(String(safeEvaluation.data.decision).toLowerCase(), 'blocked');

    const allowedFeed = await request('POST', `/ponds/${pondId}/feeding-records`, {
      requestedAmountKg: TEST_FEED_AMOUNT_KG,
      source: 'manual',
      deviceId: device.id,
    });
    assert.notEqual(String(allowedFeed.data.safetyDecision).toLowerCase(), 'blocked');

    const feedCommand = await waitForMessage(
      messages,
      (message) =>
        message.topic === commandTopic && message.payload.recordId === allowedFeed.data.id,
      5000,
    );
    assert.equal(feedCommand.payload.command, 'FEED');
    assert.equal(Number(feedCommand.payload.feedAmountKg), TEST_FEED_AMOUNT_KG);

    const feedStatus = await waitForMessage(
      messages,
      (message) =>
        message.topic === statusTopic &&
        message.payload.recordId === allowedFeed.data.id &&
        message.payload.status === 'completed',
      20000,
    );
    assert.equal(Number(feedStatus.payload.actualAmountKg), TEST_FEED_AMOUNT_KG);
    const recordsResponse = await request('GET', `/ponds/${pondId}/feeding-records`);
    const finalRecord = getRows(recordsResponse.data).find(
      (record) => record.id === allowedFeed.data.id,
    );
    assert.equal(String(finalRecord?.status).toLowerCase(), 'completed');
    assert.equal(Number(finalRecord?.actualAmountKg), TEST_FEED_AMOUNT_KG);
    console.log(
      `FEED PASS: record=${allowedFeed.data.id}; command=FEED; ` +
        `simulatorStatus=completed; actualKg=${feedStatus.payload.actualAmountKg}`,
    );
  } finally {
    if (restoreTelemetry) {
      try {
        await request(
          'POST',
          `/ponds/${pondId}/telemetry`,
          telemetryBody(`e2e-cleanup-${Date.now()}`, {
            ph: 7.8,
            dissolvedOxygenMgL: 6.8,
            temperatureC: 28.5,
            salinityPpt: 18.5,
            ammoniaMgL: 0.02,
            tanMgL: 0.2,
            turbidityNtu: 12,
          }),
        );
        console.log('CLEANUP: wrote a fresh safe telemetry sample; no historical rows were deleted.');
      } catch (error) {
        console.error(`CLEANUP ERROR: ${error.message}`);
        process.exitCode = 1;
      }
    }
    client.end();
  }
}

main().catch((error) => {
  console.error(`E2E TEST FAILED: ${error.message}`);
  process.exitCode = 1;
});
