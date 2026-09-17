import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { SignOptions } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Pond } from '../../database/entities/pond.entity';
import { UserPondAssignment } from '../../database/entities/user-pond-assignment.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Pond) private readonly pondRepository: Repository<Pond>,
    @InjectRepository(UserPondAssignment) private readonly assignmentRepository: Repository<UserPondAssignment>,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({ where: { email } });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const user = this.userRepository.create({
      email,
      passwordHash,
      fullName: registerDto.fullName.trim(),
      role: UserRole.OPERATOR,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    return this.createAuthResponse(savedUser);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.isActive || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.createAuthResponse(user);
  }

  async refreshToken(refreshToken: string) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; type?: string }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('auth.refreshTokenSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token không phải refresh token');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return this.createAuthResponse(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findUser(userId);
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.refreshTokenHash = null;
    await this.userRepository.save(user);
    return { message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' };
  }

  async findAllUsers() {
    const users = await this.userRepository.find({ order: { createdAt: 'DESC' } });
    return users.map((user) => this.toSafeUser(user));
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto, currentUserId: string) {
    const user = await this.findUser(id);
    if (id === currentUserId && !dto.isActive) {
      throw new ForbiddenException('Không thể tự khóa tài khoản đang đăng nhập');
    }
    user.isActive = dto.isActive;
    if (!dto.isActive) {
      user.refreshTokenHash = null;
    }
    await this.userRepository.save(user);
    return this.toSafeUser(user);
  }

  async assignPond(userId: string, pondId: string) {
    await this.findUser(userId);
    if (!(await this.pondRepository.findOne({ where: { id: pondId } }))) {
      throw new NotFoundException(`Không tìm thấy ao nuôi với id ${pondId}`);
    }
    const existing = await this.assignmentRepository.findOne({ where: { userId, pondId } });
    if (existing) return existing;
    return this.assignmentRepository.save(this.assignmentRepository.create({ userId, pondId }));
  }

  async removePondAssignment(userId: string, pondId: string) {
    const assignment = await this.assignmentRepository.findOne({ where: { userId, pondId } });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân quyền Pond');
    await this.assignmentRepository.remove(assignment);
    return { message: 'Đã hủy phân quyền Pond' };
  }

  private async createAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('auth.refreshTokenSecret'),
        expiresIn: this.configService.get<string>('auth.refreshTokenExpiresIn', '30d') as SignOptions['expiresIn'],
      },
    );
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: this.toSafeUser(user),
    };
  }

  private async findUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy tài khoản với id ${id}`);
    }
    return user;
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }
}