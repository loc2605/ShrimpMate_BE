import { DataSource } from 'typeorm';
import { Device } from '../entities/device.entity';
import { Pond } from '../entities/pond.entity';
import { DeviceMode, DeviceStatus, DeviceType } from '../entities/enums';

export async function seedDeviceData(dataSource: DataSource) {
  const deviceRepository = dataSource.getRepository(Device);
  const pondRepository = dataSource.getRepository(Pond);

  const ponds = await pondRepository.find({ order: { code: 'ASC' } });

  if ((await deviceRepository.count()) > 0) {
    return;
  }

  const devices = await deviceRepository.save([
    {
      pondId: ponds[0]?.id ?? null,
      deviceUid: 'DEV-FEEDER-001',
      name: 'Máy cho ăn Ao 1',
      type: DeviceType.FEEDER,
      status: DeviceStatus.ONLINE,
      mode: DeviceMode.AUTOMATIC,
      firmwareVersion: '1.0.0',
      metadata: { zone: 'north', batteryLevel: 88 },
    },
    {
      pondId: ponds[1]?.id ?? null,
      deviceUid: 'DEV-SENSOR-001',
      name: 'Sensor pH Ao 2',
      type: DeviceType.SENSOR_NODE,
      status: DeviceStatus.ONLINE,
      mode: DeviceMode.MANUAL,
      firmwareVersion: '2.1.0',
      metadata: { parameter: 'ph', batteryLevel: 71 },
    },
    {
      pondId: null,
      deviceUid: 'DEV-FEEDER-002',
      name: 'Máy cho ăn tự động 02',
      type: DeviceType.FEEDER,
      status: DeviceStatus.ONLINE,
      mode: DeviceMode.AUTOMATIC,
      firmwareVersion: '1.0.0',
      metadata: { zone: 'south', batteryLevel: 95 },
    },
    {
      pondId: null,
      deviceUid: 'DEV-SENSOR-002',
      name: 'Sensor giám sát nước 02',
      type: DeviceType.SENSOR_NODE,
      status: DeviceStatus.ONLINE,
      mode: DeviceMode.AUTOMATIC,
      firmwareVersion: '1.0.0',
      metadata: { parameter: 'ph_do', batteryLevel: 80 },
    },
  ]);

  return { devices };
}
