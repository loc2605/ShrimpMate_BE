export const FEEDING_QUEUE_NAME = 'feeding-queue';

export enum FeedingJobType {
  DISPATCH_SCHEDULED_FEEDING = 'DISPATCH_SCHEDULED_FEEDING',
}

export interface FeedingJobData {
  scheduleId: string;
  pondId: string;
  scheduleName: string;
  scheduledTime: string; // "HH:mm"
  dateKey: string; // "YYYY-MM-DD"
  feedAmountKg?: number;
  spreadRateKgPerMinute?: number;
  retryAttempt?: number;
}

export interface FeedingJobResult {
  success: boolean;
  recordId?: string;
  status: string;
  actualAmountKg?: number;
  message?: string;
}

