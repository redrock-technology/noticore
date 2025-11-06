import { NotiCoreDeliveryChannelEnum, NotiCorePriorityEnum } from '../../../enums';
import { INotiCoreNotificationData, INotiCoreNotificationPayload } from '../../../interfaces';

export class CreateNotificationDeliveryServiceRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  userId: string;
  payload: INotiCoreNotificationPayload;
  priority: NotiCorePriorityEnum;
  data: INotiCoreNotificationData;
  recipients: Set<string>;
  additionalData?: Record<string, any>;
  handleInvalidFCMTokens: (invalidTokens: string[]) => Promise<void>;
}
