export class NotiCoreCreateNotificationRequestDto {
  notificationId: string;
  userId: string;
  recipients: Set<string>;
  additionalData?: Record<string, any>;
}
