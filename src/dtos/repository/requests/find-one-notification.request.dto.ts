export class FindOneNotificationRequestDto {
  id: string;
  userId?: string;
  relations?: Set<string>;
  where?: any;
  throwError?: boolean;
}
