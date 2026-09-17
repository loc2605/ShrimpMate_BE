import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { DeviceMode } from '../../database/entities/enums';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { User } from '../../database/entities/user.entity';
import { PondAccessService } from '../../common/guards/pond-access.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    private readonly pondAccessService: PondAccessService,
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

    try {
      return await this.deviceRepository.save(device);
    } catch (error) {
      this.throwDeviceUidConflict(error);
    }
  }

  async findAllDevices(user?: User) {
    const assignedPondIds = user ? await this.pondAccessService.findAssignedPondIds(user) : null;
    const where = assignedPondIds
      ? assignedPondIds.length > 0
        ? assignedPondIds.map((pondId) => ({ pondId }))
        : { id: '00000000-0000-0000-0000-000000000000' }
      : undefined;
    return this.deviceRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { pond: true },
    });
  }

  async findDeviceById(id: string, user?: User) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: { pond: true },
    });

    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
    }
    if (user && device.pondId) {
      await this.pondAccessService.ensureCanAccess(user, device.pondId);
    }

    return device;
  }

  async updateDevice(id: string, updateDeviceDto: UpdateDeviceDto, user?: User) {
    const device = await this.findDeviceById(id, user);

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
        if (user) {
          await this.pondAccessService.ensureCanAccess(user, updateDeviceDto.pondId);
        }
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

    try {
      return await this.deviceRepository.save(device);
    } catch (error) {
      this.throwDeviceUidConflict(error);
    }
  }

  async removeDevice(id: string) {
    const device = await this.findDeviceById(id);
    await this.deviceRepository.remove(device);
    return { message: `Đã xoá thiết bị ${device.name}` };
  }

  async emergencyStop(id: string, user?: User) {
    const device = await this.findDeviceById(id, user);
    device.mode = DeviceMode.EMERGENCY_STOP;
    return this.deviceRepository.save(device);
  }

  async heartbeat(id: string, user?: User) {
    const device = await this.findDeviceById(id, user);
    device.lastSeenAt = new Date();
    return this.deviceRepository.save(device);
  }

  private async ensurePondExists(pondId: string) {
    const pond = await this.pondRepository.findOne({ where: { id: pondId } });
    if (!pond) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    return pond;
  }

  private throwDeviceUidConflict(error: unknown): never {
    if (error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
      throw new BadRequestException('device_uid đã tồn tại');
    }
    throw error;
  }
}
