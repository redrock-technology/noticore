export class FindPendingNotificationRequestDto {
  exclude?: string[];
  take: number;
  where?: any;
  order?: {
    [key: string]: 'ASC' | 'DESC';
  };
  maxRetryCount: number;
}
