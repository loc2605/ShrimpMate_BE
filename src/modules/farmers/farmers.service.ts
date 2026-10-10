import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { Farm } from '../../database/entities/farm.entity';
import { Pond } from '../../database/entities/pond.entity';
import { FarmerAssignment } from '../../database/entities/farmer-assignment.entity';
import { UserRole } from '../../database/entities/enums';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { AssignFarmerDto } from './dto/assign-farmer.dto';
import { normalizePhoneNumber } from '../../common/utils/phone.util';

@Injectable()
export class FarmersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(Pond)
    private readonly pondRepository: Repository<Pond>,
    @InjectRepository(FarmerAssignment)
    private readonly assignmentRepository: Repository<FarmerAssignment>,
  ) {}

  /**
   * Manager trực tiếp tạo tài khoản cho Farmer với mật khẩu ngẫu nhiên
   */
  async createFarmer(manager: User, dto: CreateFarmerDto) {
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    await this.ensureUniquePhoneNumber(phoneNumber);

    const email = dto.email
      ? dto.email.trim().toLowerCase()
      : `farmer_${phoneNumber}@shrimpmate.local`;
    await this.ensureUniqueEmail(email);

    // Sinh mật khẩu ngẫu nhiên an toàn 8 ký tự, ví dụ: "Fm#a8B2x9"
    const randomSuffix = randomBytes(4).toString('hex');
    const initialPassword = `Fm#${randomSuffix}`;
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    const farmer = this.userRepository.create({
      fullName: dto.fullName.trim(),
      phoneNumber,
      email,
      passwordHash,
      role: UserRole.FARMER,
      managerId: manager.role === UserRole.ADMIN ? null : manager.id,
      isActive: true,
    });

    const savedFarmer = await this.userRepository.save(farmer);
    const { passwordHash: _, refreshTokenHash: __, ...safeFarmer } = savedFarmer;

    return {
      message: 'Tạo tài khoản Farmer thành công',
      farmer: safeFarmer,
      initialPassword, // Hiển thị 1 lần cho Manager đưa cho Farmer
    };
  }

  /**
   * Danh sách Người nuôi do Manager quản lý
   */
  async findAllFarmers(currentUser: User) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.FARMER })
      .orderBy('user.created_at', 'DESC');

    if (currentUser.role === UserRole.MANAGER) {
      query.andWhere('user.manager_id = :managerId', { managerId: currentUser.id });
    }

    const farmers = await query.getMany();

    // Đính kèm số lượng phân công
    const result = await Promise.all(
      farmers.map(async (farmer) => {
        const assignmentCount = await this.assignmentRepository.count({
          where: { farmerId: farmer.id },
        });
        const { passwordHash: _, refreshTokenHash: __, ...safe } = farmer;
        return {
          ...safe,
          assignmentCount,
        };
      }),
    );

    return result;
  }

  /**
   * Xem chi tiết Farmer kèm các ao/trang trại được phân công
   */
  async findFarmerById(id: string, currentUser: User) {
    const farmer = await this.ensureFarmerAccess(id, currentUser);

    const assignments = await this.assignmentRepository.find({
      where: { farmerId: farmer.id },
      relations: { farm: true, pond: true },
      order: { createdAt: 'DESC' },
    });

    const { passwordHash: _, refreshTokenHash: __, ...safe } = farmer;
    return {
      ...safe,
      assignments,
    };
  }

  /**
   * Cập nhật thông tin Người nuôi
   */
  async updateFarmer(id: string, dto: UpdateFarmerDto, currentUser: User) {
    const farmer = await this.ensureFarmerAccess(id, currentUser);

    if (dto.fullName) {
      farmer.fullName = dto.fullName.trim();
    }

    if (dto.phoneNumber) {
      const normalized = normalizePhoneNumber(dto.phoneNumber);
      if (normalized !== farmer.phoneNumber) {
        await this.ensureUniquePhoneNumber(normalized);
        farmer.phoneNumber = normalized;
      }
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== farmer.email) {
        await this.ensureUniqueEmail(email);
        farmer.email = email;
      }
    }

    const updated = await this.userRepository.save(farmer);
    const { passwordHash: _, refreshTokenHash: __, ...safe } = updated;
    return safe;
  }

  /**
   * Khóa hoặc mở khóa tài khoản Farmer
   */
  async toggleFarmerStatus(id: string, isActive: boolean, currentUser: User) {
    const farmer = await this.ensureFarmerAccess(id, currentUser);
    farmer.isActive = isActive;
    await this.userRepository.save(farmer);
    return {
      message: `Đã ${isActive ? 'mở khóa' : 'khóa'} tài khoản Farmer ${farmer.fullName}`,
      isActive,
    };
  }

  /**
   * Phân công trang trại hoặc ao nuôi cho Farmer
   */
  async assignFarmer(farmerId: string | undefined, dto: AssignFarmerDto, currentUser: User) {
    const targetFarmerId = farmerId || dto.farmerId;
    if (!targetFarmerId) {
      throw new BadRequestException('Vui lòng chỉ định farmerId');
    }

    const farmer = await this.ensureFarmerAccess(targetFarmerId, currentUser);

    const farm = await this.farmRepository.findOne({ where: { id: dto.farmId } });
    if (!farm) {
      throw new NotFoundException(`Không tìm thấy trang trại với id ${dto.farmId}`);
    }

    if (currentUser.role === UserRole.MANAGER && farm.ownerId !== currentUser.id) {
      throw new ForbiddenException('Bạn không phải chủ sở hữu của trang trại này');
    }

    const effectivePondIds =
      dto.pondIds && dto.pondIds.length > 0
        ? dto.pondIds
        : dto.pondId
          ? [dto.pondId]
          : [];

    // Nếu có chỉ định pondIds cụ thể
    if (effectivePondIds.length > 0) {
      const ponds = await this.pondRepository.find({
        where: effectivePondIds.map((pId) => ({ id: pId, farmId: farm.id })),
      });

      if (ponds.length !== effectivePondIds.length) {
        throw new BadRequestException('Một hoặc nhiều ao nuôi không tồn tại trong trang trại này');
      }

      // Xóa các phân công trùng lặp trước đó trong cùng trang trại
      await this.assignmentRepository.delete({ farmerId: farmer.id, farmId: farm.id });

      const newAssignments = ponds.map((pond) =>
        this.assignmentRepository.create({
          farmerId: farmer.id,
          farmId: farm.id,
          pondId: pond.id,
        }),
      );

      const saved = await this.assignmentRepository.save(newAssignments);
      return {
        message: `Đã phân công ${saved.length} ao nuôi cho Farmer ${farmer.fullName}`,
        assignments: saved,
      };
    }

    // Nếu không chỉ định pondIds -> Phân công toàn bộ trang trại (pondId: null)
    await this.assignmentRepository.delete({ farmerId: farmer.id, farmId: farm.id });

    const wholeFarmAssignment = this.assignmentRepository.create({
      farmerId: farmer.id,
      farmId: farm.id,
      pondId: null,
    });

    const saved = await this.assignmentRepository.save(wholeFarmAssignment);
    return {
      message: `Đã phân công toàn bộ trang trại ${farm.name} cho Farmer ${farmer.fullName}`,
      assignment: saved,
    };
  }

  /**
   * Danh sách tất cả phân công (toàn bộ hoặc của Manager)
   */
  async listAllAssignments(currentUser: User) {
    if (currentUser.role === UserRole.ADMIN) {
      return this.assignmentRepository.find({
        relations: { farm: true, pond: true, farmer: true },
        order: { createdAt: 'DESC' },
      });
    }

    return this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.farm', 'farm')
      .leftJoinAndSelect('assignment.pond', 'pond')
      .leftJoinAndSelect('assignment.farmer', 'farmer')
      .where('farm.ownerId = :managerId', { managerId: currentUser.id })
      .orderBy('assignment.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Lấy danh sách phân công của một Farmer
   */
  async getFarmerAssignments(farmerId: string, currentUser: User) {
    if (currentUser.role === UserRole.FARMER && currentUser.id !== farmerId) {
      throw new ForbiddenException('Bạn chỉ có quyền xem phân công của chính mình');
    }

    if (currentUser.role === UserRole.MANAGER) {
      await this.ensureFarmerAccess(farmerId, currentUser);
    }

    return this.assignmentRepository.find({
      where: { farmerId },
      relations: { farm: true, pond: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Hủy một phân công cụ thể
   */
  async removeAssignment(assignmentId: string, currentUser: User) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: { farm: true },
    });

    if (!assignment) {
      throw new NotFoundException(`Không tìm thấy bản ghi phân công với id ${assignmentId}`);
    }

    if (currentUser.role === UserRole.MANAGER && assignment.farm.ownerId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền thu hồi phân công này');
    }

    await this.assignmentRepository.remove(assignment);
    return { message: 'Đã thu hồi phân công thành công' };
  }

  /**
   * Thu hồi toàn bộ phân công của Farmer
   */
  async clearFarmerAssignments(farmerId: string, currentUser: User) {
    await this.ensureFarmerAccess(farmerId, currentUser);
    await this.assignmentRepository.delete({ farmerId });
    return { message: 'Đã thu hồi toàn bộ phân công của Farmer' };
  }

  // --- Helper Methods ---
  private async ensureFarmerAccess(farmerId: string, currentUser: User): Promise<User> {
    const farmer = await this.userRepository.findOne({ where: { id: farmerId, role: UserRole.FARMER } });
    if (!farmer) {
      throw new NotFoundException(`Không tìm thấy Người nuôi với id ${farmerId}`);
    }

    if (currentUser.role === UserRole.MANAGER && farmer.managerId !== currentUser.id) {
      throw new ForbiddenException('Người nuôi này không thuộc quyền quản lý của bạn');
    }

    return farmer;
  }

  private async ensureUniquePhoneNumber(phoneNumber: string) {
    const existing = await this.userRepository.findOne({ where: { phoneNumber } });
    if (existing) {
      throw new ConflictException(`Số điện thoại ${phoneNumber} đã được sử dụng`);
    }
  }

  private async ensureUniqueEmail(email: string) {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`Email ${email} đã được sử dụng`);
    }
  }
}
