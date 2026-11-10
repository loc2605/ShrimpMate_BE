import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CooldownCheckResult {
  isThrottled: boolean;
  cooldownRemainingSeconds: number;
}

@Injectable()
export class AlertCooldownService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertCooldownService.name);
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  // In-Memory Fallback khi Redis không khả dụng
  private readonly inMemoryCooldowns = new Map<string, number>();

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
        this.logger.log(`[AlertCooldown] Đã kết nối Redis chống bão cảnh báo tại ${host}:${port}`);
      });

      this.redisClient.on('error', () => {
        if (this.isRedisConnected) {
          this.logger.warn('[AlertCooldown] Mất kết nối Redis. Chuyển sang cơ chế Debounce In-Memory.');
        }
        this.isRedisConnected = false;
      });

      await this.redisClient.connect().catch(() => {
        this.isRedisConnected = false;
        this.logger.warn('[AlertCooldown] Không thể kết nối Redis. Tự động kích hoạt Debounce In-Memory.');
      });
    } catch {
      this.isRedisConnected = false;
    }
  }

  /**
   * Kiểm tra và thiết lập Cooldown Lock (Atomic SET NX)
   * Trả về true nếu là LẦN ĐẦU TIÊN (được phép gửi cảnh báo), false nếu ĐANG TRONG COOLDOWN (chống spam)
   * Lệnh Redis: SET alert:cooldown:{pondId}:{metric} 1 EX 900 NX
   */
  async acquireAlertLock(
    pondId: string,
    metricOrType: string,
    ttlSeconds: number = 900,
  ): Promise<boolean> {
    const key = `alert:cooldown:${pondId}:${metricOrType}`;

    if (this.isRedisConnected && this.redisClient) {
      try {
        const result = await this.redisClient.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (err: any) {
        this.logger.warn(`[AlertCooldown] Lỗi Redis SET NX: ${err.message}. Fallback sang bộ nhớ đệm.`);
      }
    }

    // In-memory fallback
    const now = Date.now();
    const expiresAt = this.inMemoryCooldowns.get(key);
    if (expiresAt && expiresAt > now) {
      return false; // Đang trong cooldown -> Throttled
    }

    this.inMemoryCooldowns.set(key, now + ttlSeconds * 1000);
    return true; // Được phép tạo cảnh báo mới
  }

  /**
   * Tạo khuyến nghị hành động can thiệp thủy sản thông minh gắn với sự cố
   */
  getAquacultureRecommendation(type: string, metric?: string, value?: number): string {
    switch (type) {
      case 'CRITICAL_DO_LOW':
        return 'Khuyến nghị khẩn cấp: Bật ngay 100% dàn quạt nước và sục khí oxy đáy trong 45-60 phút. Ngưng ngay cữ ăn hiện tại cho đến khi DO phục hồi trên 4.0 mg/L.';
      case 'WARNING_DO_LOW':
        return 'Khuyến nghị: Khởi động quạt nước tăng cường, giảm 30%-50% lượng thức ăn cữ kế tiếp để giảm nhu cầu tiêu thụ oxy sinh học (BOD).';

      case 'CRITICAL_PH_OUT_OF_RANGE':
        if (value !== undefined && value < 7.0) {
          return 'Khuyến nghị: pH tụt thấp nguy hiểm. Tạt vôi nông nghiệp CaCO3 hoặc Dolomite liều lượng 15-20 kg/1.000m³ vào lúc 20h00-22h00 để nâng hệ đệm.';
        }
        return 'Khuyến nghị: pH tăng cao nguy hiểm. Xử lý hạ pH bằng mật rỉ đường ủ men vi sinh (2-3 lít/1.000m³) lúc sáng sớm hoặc dùng acid acetic hữu cơ loãng.';
      case 'WARNING_PH_ABNORMAL':
        return 'Khuyến nghị: Theo dõi độ kiềm (Alkalinity), điều chỉnh độ đệm nước bằng vôi Dolomite 10 kg/1.000m³.';

      case 'CRITICAL_AMMONIA_HIGH':
        return 'Khuyến nghị khẩn cấp: Khí độc NH₃/TAN vượt ngưỡng cực đoan. Cắt giảm 100% thức ăn, thay/xả đáy 20% nước và tạt ngay chế phẩm vi sinh Yucca kết hợp Zeolite.';
      case 'WARNING_AMMONIA_HIGH':
        return 'Khuyến nghị: Bổ sung chế phẩm men vi sinh xử lý đáy ao (Bacillus spp.), giảm 20% khẩu phần ăn để hạn chế tích tụ mùn bã hữu cơ.';

      case 'CRITICAL_TEMPERATURE':
        return 'Khuyến nghị: Bơm bổ sung nước mát tầng sâu, căng lưới lan chống nắng gắt hoặc chạy quạt nước liên tục chống phân tầng nhiệt độ.';
      case 'WARNING_TEMPERATURE':
        return 'Khuyến nghị: Nhiệt độ biến động. Điều chỉnh lượng thức ăn theo biểu đồ dinh dưỡng nhiệt độ (giảm ăn khi trời quá lạnh hoặc nắng gắt).';

      case 'CRITICAL_SALINITY':
        return 'Khuyến nghị: Độ mặn sốc nước. Cấp bổ sung nước ngọt hoặc nước mặn từ từ (tối đa không quá 3 ppt/ngày) để tôm thích nghi thẩm thấu.';
      case 'WARNING_SALINITY':
        return 'Khuyến nghị: Kiểm tra nguồn nước cấp và duy trì độ mặn ổn định cho lứa tuổi của tôm.';

      case 'CRITICAL_TURBIDITY_HIGH':
      case 'WARNING_TURBIDITY_HIGH':
        return 'Khuyến nghị: Đánh lắng phù sa bằng khoáng chất hoặc men vi sinh xử lý lơ lửng, kiểm tra lại bờ ao tránh sạt lở sau mưa.';

      case 'AUTO_FEEDING_BLOCKED':
      case 'FEEDING_SAFETY_BLOCKED':
        return 'Khuyến nghị: Cữ ăn bị chặn an toàn. Giữ nguyên máy cho ăn ở trạng thái dừng, kiểm tra lại chất lượng nước bờ ao trước khi bật lệnh cho ăn bù.';

      case 'FEEDER_OFFLINE_BLOCKED':
      case 'DEVICE_OFFLINE':
        return 'Khuyến nghị: Kiểm tra nguồn điện trạm cấp, ăng-ten WiFi/LoRa và dây cáp nối phần cứng thiết bị tại bờ ao.';

      default:
        return 'Khuyến nghị: Cán bộ kỹ thuật kiểm tra bờ ao, đo lại mẫu nước đối chứng và vận hành thiết bị phụ trợ nếu cần thiết.';
    }
  }
}

