import { NotiCoreDeliveryChannelEnum } from '../../../enums/delivery-channel.enum';
import { NotiCoreDeliveryObject } from '../../../interfaces';

export class DeliverCreatedNotificationServiceRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  lockTTL: number;
}

export class DeliverFailedNotificationServiceRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  maxDeliveryAttempts: number;
  lockTTL: number;
}

export class CheckForPendingNotificationServiceRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  checkDeadLineCronSeconds: number;
  lockTTL: number;
}

export class DeliverPendingNotificationsServiceRequestDto {
  ids: string[];
  handleInvalidFCMTokens: (invalidTokens: string[]) => Promise<void>;
}

export class SendNotificationServiceDto<T extends NotiCoreDeliveryObject> {
  notifications: T[];
  handleInvalidFCMTokens: (invalidTokens: string[]) => Promise<void>;
}

export class ScheduleForSendServiceRequestDto<T extends NotiCoreDeliveryObject> {
  channelType: NotiCoreDeliveryChannelEnum;
  notifications: T[];
}
