import { NotiCoreDeliveryChannelEnum } from '../enums';
import { INotiCoreNotificationData, INotiCoreNotificationPayload } from './notification-entity.interface';

/**
 * notification mq event publisher and dtos
 *
 * this interface is used to publish notification mq events
 * and the dtos are used to create the notification mq events
 *
 */


/**
 * this dto will be used to send scheduled notifications (AKA pending notifications) via message senders
 * this also will be used to call NotiCoreDeliveryService.deliverPendingNotifications method
 * you need to implement a consumer on read this message and call NotiCoreDeliveryService.deliverPendingNotifications method
 */
export interface INotiCoreScheduledNotificationsMqDto {
  notificationIds: string[];
}


/**
 * When a notification is created, then this event will be published
 * based on this event we will create the DeliveryRecords for each channel and send them via message senders
 */
export interface INotiCoreCreateNotificationMqDto {
  notificationId: string;
  userId: string;
  [key: string]: any;
}

/**
 * When we want to directly create a delivery record without a notification entity, then this event will be published
 * based on this event we will create the DeliveryRecords for each channel and send them via message senders
 */
export interface INotiCoreCreateNotificationDeliveryMqDto {
  channelType: NotiCoreDeliveryChannelEnum;
  userId: string;
  payload: INotiCoreNotificationPayload;
  data: INotiCoreNotificationData;
  [key: string]: any; //[TODO] must cover priority and additionalData
}


/**
 * When a reference is deleted, then this event will be published
 * basically each notification has a reference (or a reason to be created) and when this reference is deleted, then this event will be published
 * to remove the notification record, but the delivery records will be still there to track the history of actions
 */
export interface INotiCoreReferenceDeletedNotificationMqDto {
  referenceId: string;
  [key: string]: any;
}

/**
 * When a user is deleted, then this event will be published
 * basically each notification has a user (or a recipient) and when this user is deleted, then this event will be published
 * to remove the notification record, but the delivery records will be still there to track the history of actions
 */
export interface INotiCoreUserDeletedNotificationPartitionMqDto {
  userId: string;
  lastId?: string;
  traceId: string;
}

/**
 * this interface is used to publish notification mq events
 * you need to implement a consumer on read these published events and handle the notification logic
 */
export interface INotiCoreNotificationMQEventPublisher {
  publishNotificationCreated(dto: INotiCoreCreateNotificationMqDto[]): Promise<void>;

  publishNotificationReferenceDeleted(dto: INotiCoreReferenceDeletedNotificationMqDto): Promise<void>;

  publishUserDeletedNotificationDeletePartition(
    dto: INotiCoreUserDeletedNotificationPartitionMqDto[],
  ): Promise<void>;
}

/**
 * this interface is used to publish delivery mq events
 * you need to implement a consumer on read these published events and handle the delivery logic
 */
export interface INotiCoreDeliveryMQEventPublisher {
  publishNotificationScheduled(dto: INotiCoreScheduledNotificationsMqDto[]): Promise<void>;
}
