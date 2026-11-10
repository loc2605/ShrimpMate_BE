import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { TokenBlacklistService } from './token-blacklist.service';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  jti?: string;
  tokenVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // 1. Kiểm tra JWT Blacklist (nếu token đã đăng xuất)
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Phiên làm việc đã bị thu hồi do đăng xuất');
      }
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa');
    }

    if (user.isAdminLocked) {
      throw new UnauthorizedException(
        'Tài khoản đang bị khóa (ACCOUNT_PENDING_ADMIN_UNLOCK). Vui lòng liên hệ Admin.',
      );
    }

    // 2. Kiểm tra tokenVersion (khi quyền hạn thay đổi hoặc bị thu hồi phiên làm việc)
    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== undefined &&
      payload.tokenVersion < user.tokenVersion
    ) {
      throw new UnauthorizedException('Phiên làm việc đã hết hiệu lực do quyền hạn tài khoản đã được cập nhật');
    }

    return user;
  }
}