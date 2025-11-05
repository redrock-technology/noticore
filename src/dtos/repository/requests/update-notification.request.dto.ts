import { NotificationFailureReason } from '../../../factories/notification.failure-message.factory';

export class UpdateNotificationRequestDto {
  id: string;
  errorReason?: NotificationFailureReason;
  delay?: number;
}
