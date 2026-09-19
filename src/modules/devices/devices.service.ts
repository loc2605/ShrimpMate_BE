import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Device } from '../../database/entities/device.entity';
import { Pond } from '../../database/entities/pond.entity';
import { DeviceMode, DeviceStatus, UserRole } from '../../database/entities/enums';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { ClaimDeviceDto } from './dto/claim-device.dto';
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
  ) { }

  async createDevice(createDeviceDto: CreateDeviceDto, _user?: User) {
    const normalizedUid = createDeviceDto.deviceUid.trim();
    const existingDevice = await this.deviceRepository.findOne({
      where: { deviceUid: normalizedUid },
    });

    if (existingDevice) {
      throw new BadRequestException(`device_uid ${normalizedUid} đã tồn tại trong hệ thống`);
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
    if (user && user.role === UserRole.ADMIN) {
      return this.deviceRepository.find({
        order: { createdAt: 'DESC' },
        relations: { pond: true },
      });
    }

    const assignedPondIds = user ? await this.pondAccessService.findAssignedPondIds(user) : null;
    if (!assignedPondIds || assignedPondIds.length === 0) {
      return [];
    }

    return this.deviceRepository.find({
      where: assignedPondIds.map((pondId) => ({ pondId })),
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

    if (user && user.role === UserRole.FARMER) {
      if (!device.pondId) {
        throw new ForbiddenException('Bạn không có quyền truy cập thiết bị chưa được gán vào ao nuôi');
      }
      await this.pondAccessService.ensureCanAccess(user, device.pondId);
    }

    return device;
  }

  async claimDevice(dto: ClaimDeviceDto, user: User) {
    await this.ensurePondExists(dto.pondId);
    await this.pondAccessService.ensureCanAccess(user, dto.pondId);

    const device = await this.deviceRepository.findOne({
      where: { deviceUid: dto.deviceUid.trim() },
    });

    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị chuẩn với UID ${dto.deviceUid} trong danh mục hệ thống`);
    }

    if (device.pondId && device.pondId !== dto.pondId) {
      try {
        await this.pondAccessService.ensureCanAccess(user, device.pondId);
      } catch {
        throw new BadRequestException('Thiết bị này hiện đang được gán vào ao nuôi của một người dùng khác');
      }
    }

    device.pondId = dto.pondId;
    return this.deviceRepository.save(device);
  }

  async unassignDevice(id: string, user: User) {
    const device = await this.findDeviceById(id, user);
    device.pondId = null;
    return this.deviceRepository.save(device);
  }

  async updateDevice(id: string, updateDeviceDto: UpdateDeviceDto, user?: User) {
    const device = await this.findDeviceById(id, user);

    if (user && user.role === UserRole.FARMER) {
      if (updateDeviceDto.deviceUid && updateDeviceDto.deviceUid !== device.deviceUid) {
        throw new ForbiddenException('Người nuôi không thể tự thay đổi device_uid chuẩn của phần cứng');
      }
      if (updateDeviceDto.firmwareVersion && updateDeviceDto.firmwareVersion !== device.firmwareVersion) {
        throw new ForbiddenException('Chỉ Quản trị viên mới được cấu hình phiên bản firmware chuẩn');
      }
    }

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

  async removeDevice(id: string, user?: User) {
    const device = await this.findDeviceById(id, user);
    await this.deviceRepository.remove(device);
    return { message: `Đã xoá thiết bị ${device.name}` };
  }

  async emergencyStop(id: string, user?: User) {
    const device = await this.findDeviceById(id, user);
    device.mode = DeviceMode.EMERGENCY_STOP;
    return this.deviceRepository.save(device);
  }

  async heartbeat(id: string, _user?: User) {
    const device = await this.deviceRepository.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị với id ${id}`);
    }
    device.lastSeenAt = new Date();
    device.status = DeviceStatus.ONLINE;
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

