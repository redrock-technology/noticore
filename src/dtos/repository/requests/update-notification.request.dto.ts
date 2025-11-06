import { NotiCoreNotificationFailureReason } from '../../../factories/notification.failure-message.factory';

export class NotiCoreUpdateNotificationRequestDto {
  id: string;
  errorReason?: NotiCoreNotificationFailureReason;
  delay?: number;
}
