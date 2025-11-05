export class GetNotificationRequestDto {
  userId?: string;
  from?: Date;
  to?: Date;
  order: 'ASC' | 'DESC';
  page: number;
  limit: number;
  relations: Set<string>;
  where?: any;
}
