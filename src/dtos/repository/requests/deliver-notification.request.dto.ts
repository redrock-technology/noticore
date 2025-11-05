import { NotiCoreDeliveryChannelEnum } from '../../../enums/delivery-channel.enum';

export class DeliverCreatedNotificationRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
}

export class DeliverFailedNotificationRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  maxDeliveryAttempts: number;
}

export class CheckForPendingNotificationRequestDto {
  channelType: NotiCoreDeliveryChannelEnum;
  limit: number;
  checkDeadLineCronSeconds: number;
}

export class DeliverPendingNotificationsRequestDto {
  ids: string[];
}

export class UpdateSuccessfullySentNotificationsRequestDto {
  successIds: string[];
}

export class UpdateFailedNotificationsRequestDto {
  failedIds: string[];
  errorMessage: string;
}
