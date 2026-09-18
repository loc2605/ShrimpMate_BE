import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../database/entities/user.entity';
import { UserRole } from '../../database/entities/enums';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Pond } from '../../database/entities/pond.entity';
import { UserPondAssignment } from '../../database/entities/user-pond-assignment.entity';
import { PasswordResetOtp } from '../../database/entities/password-reset-otp.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpDeliveryService } from './otp-delivery.service';
import { isEmailIdentifier, normalizePhoneNumber } from '../../common/utils/phone.util';

type SafeUser = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

const PASSWORD_RESET_SUCCESS_MESSAGE =
  'Nếu tài khoản tồn tại trong hệ thống, mã OTP đã được gửi. Vui lòng kiểm tra email/SMS hoặc liên hệ quản trị viên.';
const INVALID_OTP_MESSAGE = 'Mã OTP không hợp lệ hoặc đã hết hạn';
const INVALID_CREDENTIALS_MESSAGE = 'Email/số điện thoại hoặc mật khẩu không đúng';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Pond) private readonly pondRepository: Repository<Pond>,
    @InjectRepository(UserPondAssignment) private readonly assignmentRepository: Repository<UserPondAssignment>,
    @InjectRepository(PasswordResetOtp) private readonly passwordResetOtpRepository: Repository<PasswordResetOtp>,
    private readonly otpDeliveryService: OtpDeliveryService,
  ) { }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const phoneNumber = normalizePhoneNumber(registerDto.phoneNumber);
    await this.ensureUniqueEmail(email);
    await this.ensureUniquePhoneNumber(phoneNumber);

    const passwordHash = await bcrypt.hash(registerDto.password, 12);
    const user = this.userRepository.create({
      email,
      phoneNumber,
      passwordHash,
      fullName: registerDto.fullName.trim(),
      role: UserRole.OPERATOR,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);
    return this.createAuthResponse(savedUser);
  }

  async adminCreateUser(dto: AdminCreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    await this.ensureUniqueEmail(email);
    await this.ensureUniquePhoneNumber(phoneNumber);

    const user = this.userRepository.create({
      email,
      phoneNumber,
      passwordHash: await bcrypt.hash(dto.password, 12),
      fullName: dto.fullName.trim(),
      role: dto.role,
      isActive: true,
      refreshTokenHash: null,
    });
    return this.toSafeUser(await this.userRepository.save(user));
  }

  async login(loginDto: LoginDto) {
    const user = await this.findUserByIdentifier(loginDto.identifier);

    if (!user || !user.isActive || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user?.isActive) {
      return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
    }

    const issued = await this.issuePasswordResetOtp(user, dto.identifier);
    if (!issued) {
      return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
    }

    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user?.isActive) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    const otpRecord = await this.passwordResetOtpRepository.findOne({
      where: {
        userId: user.id,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    const maxAttempts = this.configService.get<number>('auth.passwordReset.otpMaxAttempts', 5);
    if (otpRecord.attemptCount >= maxAttempts) {
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    const otpMatches = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!otpMatches) {
      otpRecord.attemptCount += 1;
      await this.passwordResetOtpRepository.save(otpRecord);
      throw new BadRequestException(INVALID_OTP_MESSAGE);
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.refreshTokenHash = null;
    await this.userRepository.save(user);

    otpRecord.usedAt = new Date();
    await this.passwordResetOtpRepository.save(otpRecord);
    await this.passwordResetOtpRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    return { message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' };
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

  async updateUserRole(id: string, dto: UpdateUserRoleDto, currentUserId: string) {
    const user = await this.findUser(id);
    if (id === currentUserId && dto.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Không thể tự hạ quyền tài khoản đang đăng nhập');
    }
    user.role = dto.role;
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

  private async findUserByIdentifier(identifier: string) {
    const trimmed = identifier.trim();
    if (isEmailIdentifier(trimmed)) {
      return this.userRepository.findOne({ where: { email: trimmed.toLowerCase() } });
    }
    return this.userRepository.findOne({ where: { phoneNumber: normalizePhoneNumber(trimmed) } });
  }

  private async ensureUniqueEmail(email: string) {
    if (await this.userRepository.findOne({ where: { email } })) {
      throw new ConflictException('Email đã được sử dụng');
    }
  }

  private async ensureUniquePhoneNumber(phoneNumber: string) {
    if (await this.userRepository.findOne({ where: { phoneNumber } })) {
      throw new ConflictException('Số điện thoại đã được sử dụng');
    }
  }

  private async issuePasswordResetOtp(user: User, identifier: string) {
    const cooldownSeconds = this.configService.get<number>('auth.passwordReset.otpRequestCooldownSeconds', 60);
    const latestOtp = await this.passwordResetOtpRepository.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    if (latestOtp) {
      const cooldownEndsAt = latestOtp.createdAt.getTime() + cooldownSeconds * 1000;
      if (Date.now() < cooldownEndsAt) {
        return false;
      }
    }

    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresInMinutes = this.configService.get<number>('auth.passwordReset.otpExpiresInMinutes', 5);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await this.passwordResetOtpRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    await this.passwordResetOtpRepository.save(
      this.passwordResetOtpRepository.create({
        userId: user.id,
        otpHash: await bcrypt.hash(otp, 10),
        expiresAt,
      }),
    );

    await this.otpDeliveryService.sendPasswordResetOtp(identifier, otp);
    return true;
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safeUser } = user;
    return safeUser;
  }
}