import { NotificationPriorityEnum } from 'src/notification/enums/notification-prioroty.enum';
import { NotiCoreDeliveryChannelEnum } from '../../../enums';
import { INotiCoreNotificationData, INotiCoreNotificationPayload } from '../../../interfaces';

export class CreateNotificationDeliveryRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  userId: string;
  payload: INotiCoreNotificationPayload;
  priority: NotificationPriorityEnum;
  data: INotiCoreNotificationData;
  recipients: Set<string>;
  additionalData?: Record<string, any>;
}
