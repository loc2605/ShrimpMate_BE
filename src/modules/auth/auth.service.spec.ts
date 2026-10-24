import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { PasswordResetOtp } from '../../database/entities/password-reset-otp.entity';
import { OtpDeliveryService } from './otp-delivery.service';
import { UserRole } from '../../database/entities/enums';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let passwordResetOtpRepository: any;
  let jwtService: any;
  let configService: any;
  let otpDeliveryService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn(),
    };

    passwordResetOtpRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
      verifyAsync: jest.fn(),
    };

    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'auth.refreshTokenSecret') return 'mock_secret_key_long_enough_32_chars';
        return 'test';
      }),
      get: jest.fn((key: string, defaultValue: any) => defaultValue),
    };

    otpDeliveryService = {
      sendPasswordResetOtp: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetOtp),
          useValue: passwordResetOtpRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: OtpDeliveryService,
          useValue: otpDeliveryService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logout', () => {
    it('should revoke refreshTokenHash and return success message', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'user@test.local',
        refreshTokenHash: 'some_hash',
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.logout('user-uuid-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
      expect(mockUser.refreshTokenHash).toBeNull();
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ message: 'Đăng xuất thành công' });
    });
  });

  describe('login and mustChangePassword', () => {
    it('should return mustChangePassword in auth response', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      const mockUser: Partial<User> = {
        id: 'user-uuid-2',
        email: 'farmer@test.local',
        passwordHash: hashedPassword,
        fullName: 'Test Farmer',
        role: UserRole.FARMER,
        isActive: true,
        mustChangePassword: true,
        refreshTokenHash: null,
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.login({
        identifier: 'farmer@test.local',
        password: 'Test@123',
      });

      expect(result.accessToken).toBe('mocked_jwt_token');
      expect(result.refreshToken).toBe('mocked_jwt_token');
      expect(result.user.mustChangePassword).toBe(true);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-uuid-2',
          mustChangePassword: true,
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('should reset mustChangePassword to false upon changing password', async () => {
      const currentHash = await bcrypt.hash('Old@123456', 10);
      const mockUser: Partial<User> = {
        id: 'user-uuid-3',
        passwordHash: currentHash,
        mustChangePassword: true,
        refreshTokenHash: 'old_refresh_token_hash',
      };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.changePassword('user-uuid-3', {
        currentPassword: 'Old@123456',
        newPassword: 'New@123456',
      });

      expect(mockUser.mustChangePassword).toBe(false);
      expect(mockUser.refreshTokenHash).toBeNull();
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' });
    });
  });
});
