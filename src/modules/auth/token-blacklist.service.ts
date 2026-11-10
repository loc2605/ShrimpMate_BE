import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface LockoutStatus {
  isLocked: boolean;
  lockType?: 'TEMPORARY' | 'ADMIN';
  remainingMinutes?: number;
  message?: string;
}

@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  // In-Memory Fallback khi Redis không khả dụng
  private readonly inMemoryBlacklist = new Map<string, number>();
  private readonly inMemoryFailedAttempts = new Map<string, { count: number; resetAt: number }>();
  private readonly inMemoryLockouts = new Map<string, { type: 'TEMPORARY' | 'ADMIN'; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initRedis();
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }

  private async initRedis() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    try {
      this.redisClient = new Redis({
        host,
        port,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.log(`[TokenBlacklist] Đã kết nối Redis bảo mật JWT & Login Lockout tại ${host}:${port}`);
      });

      this.redisClient.on('error', () => {
        if (this.isRedisConnected) {
          this.logger.warn('[TokenBlacklist] Mất kết nối Redis. Chuyển sang cơ chế In-Memory.');
        }
        this.isRedisConnected = false;
      });

      await this.redisClient.connect().catch(() => {
        this.isRedisConnected = false;
        this.logger.warn('[TokenBlacklist] Không thể kết nối Redis. Kích hoạt In-Memory Security Store.');
      });
    } catch {
      this.isRedisConnected = false;
    }
  }

  // ==================== JWT BLACKLIST ====================

  /**
   * Đưa token identifier (jti) vào Blacklist khi người dùng logout
   */
  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti || ttlSeconds <= 0) return;
    const key = `auth:blacklist:${jti}`;

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, 'revoked', 'EX', ttlSeconds);
        this.logger.log(`[Blacklist] Đã thu hồi token ${jti} (TTL: ${ttlSeconds}s)`);
        return;
      } catch (err: any) {
        this.logger.warn(`[Blacklist] Lỗi Redis blacklist: ${err.message}`);
      }
    }

    this.inMemoryBlacklist.set(jti, Date.now() + ttlSeconds * 1000);
    this.logger.log(`[Blacklist-Memory] Đã thu hồi token ${jti} trong bộ nhớ`);
  }

  /**
   * Kiểm tra xem token có nằm trong Blacklist hay không
   */
  async isTokenBlacklisted(jti: string): Promise<boolean> {
    if (!jti) return false;
    const key = `auth:blacklist:${jti}`;

    if (this.isRedisConnected && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val !== null;
      } catch {
        // fallback sang memory check
      }
    }

    const expiresAt = this.inMemoryBlacklist.get(jti);
    if (expiresAt && expiresAt > Date.now()) {
      return true;
    }
    return false;
  }

  // ==================== LOGIN LOCKOUT (BRUTE-FORCE GUARD) ====================

  /**
   * Kiểm tra xem tài khoản / định danh có đang bị khóa hay không
   */
  async checkLockout(identifier: string): Promise<LockoutStatus> {
    const lockKey = `auth:lockout:${identifier}`;

    if (this.isRedisConnected && this.redisClient) {
      try {
        const lockVal = await this.redisClient.get(lockKey);
        if (lockVal) {
          const ttl = await this.redisClient.ttl(lockKey);
          const remainingMinutes = Math.max(1, Math.ceil(ttl / 60));

          if (lockVal === 'ADMIN') {
            return {
              isLocked: true,
              lockType: 'ADMIN',
              message: 'Tài khoản đã bị khóa vĩnh viễn do sai mật khẩu quá 10 lần. Vui lòng liên hệ Admin để mở khóa.',
            };
          }

          return {
            isLocked: true,
            lockType: 'TEMPORARY',
            remainingMinutes,
            message: `Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
          };
        }
      } catch (err: any) {
        this.logger.warn(`[Lockout] Lỗi kiểm tra Redis lockout: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const memLock = this.inMemoryLockouts.get(identifier);
    if (memLock && memLock.expiresAt > Date.now()) {
      const remainingMinutes = Math.max(1, Math.ceil((memLock.expiresAt - Date.now()) / 60000));
      return {
        isLocked: true,
        lockType: memLock.type,
        remainingMinutes,
        message:
          memLock.type === 'ADMIN'
            ? 'Tài khoản đã bị khóa vĩnh viễn do sai mật khẩu quá 10 lần. Vui lòng liên hệ Admin để mở khóa.'
            : `Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      };
    }

    return { isLocked: false };
  }

  /**
   * Ghi nhận 1 lần đăng nhập sai mật khẩu và áp dụng cơ chế khóa
   */
  async recordFailedLogin(identifier: string): Promise<LockoutStatus> {
    const countKey = `auth:failed_attempts:${identifier}`;
    const lockKey = `auth:lockout:${identifier}`;
    let attempts = 1;

    if (this.isRedisConnected && this.redisClient) {
      try {
        attempts = await this.redisClient.incr(countKey);
        if (attempts === 1) {
          await this.redisClient.expire(countKey, 1800); // Lưu giữ vết trong 30 phút
        }

        if (attempts >= 10) {
          // Khóa vĩnh viễn (yêu cầu Admin mở khóa)
          await this.redisClient.set(lockKey, 'ADMIN', 'EX', 86400 * 30);
          return {
            isLocked: true,
            lockType: 'ADMIN',
            message: 'Tài khoản đã bị khóa vĩnh viễn do sai mật khẩu 10 lần liên tiếp. Vui lòng liên hệ Admin.',
          };
        }

        if (attempts >= 5) {
          // Khóa tạm thời 15 phút (900s)
          await this.redisClient.set(lockKey, 'TEMPORARY', 'EX', 900);
          return {
            isLocked: true,
            lockType: 'TEMPORARY',
            remainingMinutes: 15,
            message: 'Tài khoản tạm thời bị khóa 15 phút do đăng nhập sai 5 lần liên tiếp.',
          };
        }

        return { isLocked: false };
      } catch (err: any) {
        this.logger.warn(`[Lockout] Lỗi ghi nhận failed login: ${err.message}`);
      }
    }

    // In-memory fallback
    const now = Date.now();
    const existing = this.inMemoryFailedAttempts.get(identifier);
    if (!existing || existing.resetAt < now) {
      attempts = 1;
      this.inMemoryFailedAttempts.set(identifier, { count: 1, resetAt: now + 1800 * 1000 });
    } else {
      attempts = existing.count + 1;
      existing.count = attempts;
    }

    if (attempts >= 10) {
      this.inMemoryLockouts.set(identifier, { type: 'ADMIN', expiresAt: now + 86400 * 30 * 1000 });
      return {
        isLocked: true,
        lockType: 'ADMIN',
        message: 'Tài khoản đã bị khóa vĩnh viễn do sai mật khẩu 10 lần liên tiếp. Vui lòng liên hệ Admin.',
      };
    }

    if (attempts >= 5) {
      this.inMemoryLockouts.set(identifier, { type: 'TEMPORARY', expiresAt: now + 900 * 1000 });
      return {
        isLocked: true,
        lockType: 'TEMPORARY',
        remainingMinutes: 15,
        message: 'Tài khoản tạm thời bị khóa 15 phút do đăng nhập sai 5 lần liên tiếp.',
      };
    }

    return { isLocked: false };
  }

  /**
   * Reset số lần đăng nhập sai khi người dùng đăng nhập thành công
   */
  async resetFailedAttempts(identifier: string): Promise<void> {
    const countKey = `auth:failed_attempts:${identifier}`;
    const lockKey = `auth:lockout:${identifier}`;

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(countKey, lockKey);
      } catch {}
    }

    this.inMemoryFailedAttempts.delete(identifier);
    this.inMemoryLockouts.delete(identifier);
  }
}

