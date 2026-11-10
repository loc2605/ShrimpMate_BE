import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  FEEDING_QUEUE_NAME,
  FeedingJobData,
  FeedingJobType,
} from './feeding-queue.types';
import { FeedingWorkerService } from './feeding-worker.service';

@Injectable()
export class FeedingQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FeedingQueueService.name);

  private redisClient: Redis | null = null;
  private feedingQueue: Queue | null = null;
  private feedingWorker: Worker | null = null;
  private isRedisAvailable = false;

  // Bộ nhớ đệm chống chạy trùng lặp (In-Memory Idempotency Map) khi không dùng Redis
  private readonly executedJobIds = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly workerService: FeedingWorkerService,
  ) {}

  async onModuleInit() {
    await this.initializeRedisAndBullMQ();
  }

  async onModuleDestroy() {
    if (this.feedingWorker) {
      await this.feedingWorker.close();
    }
    if (this.feedingQueue) {
      await this.feedingQueue.close();
    }
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }

  /**
   * Khởi tạo kết nối Redis và thiết lập BullMQ Queue + Worker (có cơ chế chịu lỗi nếu Redis offline)
   */
  private async initializeRedisAndBullMQ() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    try {
      this.redisClient = new Redis({
        host,
        port,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 3000,
      });

      await this.redisClient.connect();
      this.isRedisAvailable = true;
      this.logger.log(`[BullMQ] ✅ Kết nối Redis thành công tại ${host}:${port}. Đang khởi tạo hàng đợi '${FEEDING_QUEUE_NAME}'...`);

      // 1. Tạo hàng đợi BullMQ
      this.feedingQueue = new Queue(FEEDING_QUEUE_NAME, {
        connection: this.redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 15000, // Thử lại sau 15s, 30s
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      });

      // 2. Tạo Worker xử lý Job
      this.feedingWorker = new Worker(
        FEEDING_QUEUE_NAME,
        async (job: Job<FeedingJobData>) => {
          return await this.workerService.processFeedingJob(
            { ...job.data, retryAttempt: job.attemptsMade + 1 },
            job.id || job.name,
          );
        },
        {
          connection: new Redis({
            host,
            port,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            lazyConnect: false,
          }),
          concurrency: 5,
        },
      );

      this.feedingWorker.on('failed', async (job, err) => {
        if (job) {
          const maxAttempts = job.opts.attempts || 3;
          if (job.attemptsMade >= maxAttempts) {
            await this.workerService.handleJobFailure(job.data, err);
          }
        }
      });

      this.logger.log(`[BullMQ] ✅ Hàng đợi '${FEEDING_QUEUE_NAME}' và Worker đã sẵn sàng hoạt động!`);
    } catch (err: any) {
      this.isRedisAvailable = false;
      this.logger.warn(
        `[BullMQ] ⚠️ Không thể kết nối Redis (${host}:${port}): ${err.message}. Tự động kích hoạt cơ chế In-Memory Idempotent Job Dispatcher (chống crash).`,
      );
      if (this.redisClient) {
        this.redisClient.disconnect();
        this.redisClient = null;
      }
    }
  }

  /**
   * Tạo Idempotent Job ID chuẩn: feed-{pondId}-{scheduleId}-{YYYYMMDD-HHmm}
   */
  generateJobId(pondId: string, scheduleId: string, dateKey: string, timeKey: string): string {
    const cleanTime = timeKey.replace(':', '');
    return `feed-${pondId}-${scheduleId}-${dateKey}-${cleanTime}`;
  }

  /**
   * Đẩy cữ ăn vào hàng đợi (Queue) đảm bảo tính Idempotency và Retry
   */
  async enqueueFeedingJob(jobData: FeedingJobData): Promise<boolean> {
    const { pondId, scheduleId, dateKey, scheduledTime } = jobData;
    const jobId = this.generateJobId(pondId, scheduleId, dateKey, scheduledTime);

    // 1. Kiểm tra tính Idempotency: Không bao giờ thực thi lặp 2 lần cho cùng một cữ ăn
    if (this.executedJobIds.has(jobId)) {
      this.logger.debug(`[FeedingQueue] Bỏ qua Job [${jobId}] vì đã được kích hoạt hôm nay (Idempotent).`);
      return false;
    }

    // NẾU CÓ REDIS: DÙNG BULLMQ
    if (this.isRedisAvailable && this.feedingQueue) {
      try {
        const existingJob = await this.feedingQueue.getJob(jobId);
        if (existingJob) {
          this.logger.debug(`[BullMQ] Job [${jobId}] đã tồn tại trong hàng đợi Redis, bỏ qua.`);
          return false;
        }

        await this.feedingQueue.add(FeedingJobType.DISPATCH_SCHEDULED_FEEDING, jobData, {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 15000,
          },
        });

        this.executedJobIds.add(jobId);
        this.logger.log(`[BullMQ] 📥 Đã đẩy Job [${jobId}] vào hàng đợi feeding-queue thành công.`);
        return true;
      } catch (err: any) {
        this.logger.warn(`[BullMQ] Lỗi khi đẩy vào Redis: ${err.message}. Chuyển sang In-Memory Dispatcher.`);
      }
    }

    // NẾU KHÔNG CÓ REDIS (HOẶC GẶP SỰ CỐ): DÙNG IN-MEMORY IDEMPOTENT RUNNER CÓ RETRY POLICY
    this.executedJobIds.add(jobId);
    this.executeInMemoryWithRetry(jobData, jobId);
    return true;
  }

  /**
   * Thực thi In-Memory với Retry Policy 3 lần (Backoff 15s, 30s) khi Redis offline
   */
  private executeInMemoryWithRetry(jobData: FeedingJobData, jobId: string) {
    const maxAttempts = 3;
    const executeAttempt = async (attempt: number) => {
      try {
        await this.workerService.processFeedingJob({ ...jobData, retryAttempt: attempt }, jobId);
      } catch (err: any) {
        if (attempt < maxAttempts) {
          const delayMs = attempt * 15000;
          this.logger.warn(
            `[FeedingQueue-InMemory] Thử lại Job [${jobId}] lần ${attempt + 1}/${maxAttempts} sau ${delayMs / 1000}s...`,
          );
          setTimeout(() => executeAttempt(attempt + 1), delayMs);
        } else {
          await this.workerService.handleJobFailure(jobData, err);
        }
      }
    };

    // Bắt đầu thực thi lần 1
    executeAttempt(1);
  }
}

