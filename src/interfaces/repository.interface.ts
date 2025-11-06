import {
  NotiCoreCheckForPendingNotificationRequestDto,
  NotiCoreCreateDeliveryRequestDto,
  NotiCoreDeleteNotificationForUserDeletedPartitionRequestDto,
  NotiCoreDeliverCreatedNotificationRequestDto,
  NotiCoreDeliverFailedNotificationRequestDto,
  NotiCoreDeliverPendingNotificationsRequestDto,
  NotiCoreFindOneNotificationRequestDto,
  NotiCoreFindPendingNotificationRequestDto,
  NotiCoreGetNotificationRequestDto,
  NotiCoreReferenceDeletedNotificationRequestDto,
  NotiCoreUpdateFailedNotificationsRequestDto,
  NotiCoreUpdateNotificationRequestDto,
  NotiCoreUpdateSuccessfullySentNotificationsRequestDto,
  NotiCoreUserDeletedNotificationRequestDto,
} from '../dtos/repository/requests';
import { NotiCoreDeliveryObject, NotiCoreNotificationObject } from './entity.interface';
import { INotiCorePaginationResponse } from './pagination.interface';

export interface INotiCoreNotificationRepository<T extends NotiCoreNotificationObject> {
  bulkInsert(records: T[]): Promise<T[]>;

  getnotifications(dto: NotiCoreGetNotificationRequestDto): Promise<INotiCorePaginationResponse<T>>;

  findOne(dto: NotiCoreFindOneNotificationRequestDto): Promise<T | null>;

  setAsNotified(dto: NotiCoreUpdateNotificationRequestDto): Promise<void>;

  setAsFailed(dto: NotiCoreUpdateNotificationRequestDto): Promise<void>;

  setForRetry(dto: NotiCoreUpdateNotificationRequestDto): Promise<void>;

  findPendings(dto: NotiCoreFindPendingNotificationRequestDto): Promise<T[]>;

  handleReferenceDeleted(dto: NotiCoreReferenceDeletedNotificationRequestDto): Promise<void>;

  handleUserDeleted(dto: NotiCoreUserDeletedNotificationRequestDto): Promise<
    {
      id: string;
      userId: string;
      targetUserId: string;
    }[]
  >;

  handleUserDeletedPartitionCreated(dto: NotiCoreDeleteNotificationForUserDeletedPartitionRequestDto): Promise<void>;
}

export interface INotiCoreDeliveryRepository<T extends NotiCoreDeliveryObject> {
  create(dto: NotiCoreCreateDeliveryRequestDto): Promise<T[]>;

  deliverCreatedNotifications(dto: NotiCoreDeliverCreatedNotificationRequestDto): Promise<T[]>;

  retryFailedNotifications(dto: NotiCoreDeliverFailedNotificationRequestDto): Promise<T[]>;

  checkDeadLineForPendingNotifications(dto: NotiCoreCheckForPendingNotificationRequestDto): Promise<void>;

  deliverPendingNotifications(dto: NotiCoreDeliverPendingNotificationsRequestDto): Promise<T[]>;

  updateSuccessfullySentNotifications(dto: NotiCoreUpdateSuccessfullySentNotificationsRequestDto): Promise<void>;

  updateFailedNotifications(dto: NotiCoreUpdateFailedNotificationsRequestDto): Promise<void>;
}
