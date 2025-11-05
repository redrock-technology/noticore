import {
  CheckForPendingNotificationRequestDto,
  CreateNotificationDeliveryRequestDto,
  DeleteNotificationForUserDeletedPartitionRequestDto,
  DeliverCreatedNotificationRequestDto,
  DeliverFailedNotificationRequestDto,
  DeliverPendingNotificationsRequestDto,
  FindOneNotificationRequestDto,
  FindPendingNotificationRequestDto,
  GetNotificationRequestDto,
  ReferenceDeletedNotificationRequestDto,
  UpdateFailedNotificationsRequestDto,
  UpdateNotificationRequestDto,
  UpdateSuccessfullySentNotificationsRequestDto,
  UserDeletedNotificationRequestDto,
} from '../dtos/repository/requests';
import { NotiCoreDeliveryObject, NotiCoreNotificationObject } from './entity.interface';
import { INotiCorePaginationResponse } from './pagination.interface';

export interface INotiCoreNotificationRepository<T extends NotiCoreNotificationObject> {
  bulkInsert(records: T[]): Promise<T[]>;

  getnotifications(dto: GetNotificationRequestDto): Promise<INotiCorePaginationResponse<T>>;

  findOne(dto: FindOneNotificationRequestDto): Promise<T | null>;

  setAsNotified(dto: UpdateNotificationRequestDto): Promise<void>;

  setAsFailed(dto: UpdateNotificationRequestDto): Promise<void>;

  setForRetry(dto: UpdateNotificationRequestDto): Promise<void>;

  findPendings(dto: FindPendingNotificationRequestDto): Promise<T[]>;

  handleReferenceDeleted(dto: ReferenceDeletedNotificationRequestDto): Promise<void>;

  handleUserDeleted(dto: UserDeletedNotificationRequestDto): Promise<
    {
      id: string;
      userId: string;
      targetUserId: string;
    }[]
  >;

  handleUserDeletedPartitionCreated(dto: DeleteNotificationForUserDeletedPartitionRequestDto): Promise<void>;
}

export interface INotiCoreDeliveryRepository<T extends NotiCoreDeliveryObject> {
  create(dto: CreateNotificationDeliveryRequestDto): Promise<T[]>;

  deliverCreatedNotifications(dto: DeliverCreatedNotificationRequestDto): Promise<T[]>;

  retryFailedNotifications(dto: DeliverFailedNotificationRequestDto): Promise<T[]>;

  checkDeadLineForPendingNotifications(dto: CheckForPendingNotificationRequestDto): Promise<void>;

  deliverPendingNotifications(dto: DeliverPendingNotificationsRequestDto): Promise<T[]>;

  updateSuccessfullySentNotifications(dto: UpdateSuccessfullySentNotificationsRequestDto): Promise<void>;

  updateFailedNotifications(dto: UpdateFailedNotificationsRequestDto): Promise<void>;
}
