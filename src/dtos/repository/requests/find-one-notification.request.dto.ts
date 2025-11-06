export class NotiCoreFindOneNotificationRequestDto {
  id: string;
  userId?: string;
  relations?: Set<string>;
  where?: any;
  throwError?: boolean;
}
