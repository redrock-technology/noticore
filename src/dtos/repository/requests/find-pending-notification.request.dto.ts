export class NotiCoreFindPendingNotificationRequestDto {
  exclude?: string[];
  take: number;
  where?: any;
  order?: {
    [key: string]: 'ASC' | 'DESC';
  };
  maxRetryCount: number;
}
