import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
  ) {}

  async createDevice(createDeviceDto: CreateDeviceDto) {
    const normalizedUid = createDeviceDto.deviceUid.trim();
    const existingDevice = await this.deviceRepository.findOne({
      where: { deviceUid: normalizedUid },
    });

    if (existingDevice) {
      throw new BadRequestException(`device_uid ${normalizedUid} đã tồn tại`);
    }

    const pondId = createDeviceDto.pondId ?? null;
    if (pondId) {
      await this.ensurePondExists(pondId);
    }

    const device = this.deviceRepository.create({
      ...createDeviceDto,
      deviceUid: normalizedUid,
      name: createDeviceDto.name.trim(),
      pondId,
      firmwareVersion: createDeviceDto.firmwareVersion?.trim() ?? null,
      metadata: createDeviceDto.metadata ?? {},
    });

    return this.deviceRepository.save(device);
  }

  async findAllDevices() {
    return this.deviceRepository.find({
      order: { createdAt: 'DESC' },
      relations: { pond: true },
    });
  }

  async findDeviceById(id: string) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: { pond: true },
    });

    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
    }

    return device;
  }

  async updateDevice(id: string, updateDeviceDto: UpdateDeviceDto) {
    const device = await this.findDeviceById(id);

    if (updateDeviceDto.deviceUid && updateDeviceDto.deviceUid.trim() !== device.deviceUid) {
      const existing = await this.deviceRepository.findOne({
        where: { deviceUid: updateDeviceDto.deviceUid.trim() },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(`device_uid ${updateDeviceDto.deviceUid.trim()} đã tồn tại`);
      }
    }

    if (updateDeviceDto.pondId !== undefined) {
      if (updateDeviceDto.pondId) {
        await this.ensurePondExists(updateDeviceDto.pondId);
      }
      device.pondId = updateDeviceDto.pondId ?? null;
    }

    Object.assign(device, {
      ...updateDeviceDto,
      deviceUid: updateDeviceDto.deviceUid?.trim() ?? device.deviceUid,
      name: updateDeviceDto.name?.trim() ?? device.name,
      firmwareVersion: updateDeviceDto.firmwareVersion !== undefined ? updateDeviceDto.firmwareVersion?.trim() ?? null : device.firmwareVersion,
      metadata: updateDeviceDto.metadata ?? device.metadata,
    });

    return this.deviceRepository.save(device);
  }

  async removeDevice(id: string) {
    const device = await this.findDeviceById(id);
    await this.deviceRepository.remove(device);
    return { message: `Đã xoá thiết bị ${device.name}` };
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }
}
