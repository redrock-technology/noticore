import { NotiCoreDeliveryChannelEnum, NotiCoreNotificationStatusEnum } from '../enums';

export interface INotiCoreNotificationPayload {
  body: string;
  title?: string;
  imageUrl?: string;
  avatarUrl?: string;
  attachmentUrls?: string[];
}

export interface INotiCoreNotificationData {
  type: string;
  referenceId: string;
  referenceType: string;
}

export interface INotiCoreDeliveryEntity {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  payload: INotiCoreNotificationPayload;
  data: INotiCoreNotificationData;
  channelType: NotiCoreDeliveryChannelEnum;
  status: NotiCoreNotificationStatusEnum;
  recipient: string;
  errorMessage: string | null;
  retryCount: number | null;
}

export interface INotiCoreNotificationEntity extends INotiCoreNotificationData {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  status: NotiCoreNotificationStatusEnum;
  errorMessage: string | null;
  retryCount: number | null;
  retryAt: Date | null;
  seenAt: Date | null;
  expireAt: Date | null;
}
