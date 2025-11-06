import { NotiCoreDeliveryChannelEnum } from '../../../enums/delivery-channel.enum';

export class NotiCoreDeliverCreatedNotificationRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
}

export class NotiCoreDeliverFailedNotificationRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  maxDeliveryAttempts: number;
}

export class NotiCoreCheckForPendingNotificationRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  checkDeadLineCronSeconds: number;
}

export class NotiCoreDeliverPendingNotificationsRequestDto {
  ids: string[];
}

export class NotiCoreUpdateSuccessfullySentNotificationsRequestDto {
  successIds: string[];
}

export class NotiCoreUpdateFailedNotificationsRequestDto {
  failedIds: string[];
  errorMessage: string;
}
