import { FindOptionsOrder, FindOptionsWhere, In, LessThanOrEqual, Raw, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { NotiCoreDeliveryObject } from '../../interfaces';
import { NotiCoreDeliveryChannelEnum, NotiCoreNotificationStatusEnum, NotiCorePriorityEnum } from '../../enums';
import {
  CheckForPendingNotificationRequestDto,
  CreateNotificationDeliveryRequestDto,
  DeliverCreatedNotificationRequestDto,
  DeliverFailedNotificationRequestDto,
  DeliverPendingNotificationsRequestDto,
  UpdateFailedNotificationsRequestDto,
  UpdateSuccessfullySentNotificationsRequestDto,
} from '../../dtos/repository/requests';
import { INotiCoreDeliveryRepository } from '../../interfaces/repository.interface';

export class NotiCoreDeliveryTypeORMRepository<T extends NotiCoreDeliveryObject>
  implements INotiCoreDeliveryRepository<T>
{
  constructor(private readonly repository: Repository<T>) {}

  async create(dto: CreateNotificationDeliveryRequestDto): Promise<T[]> {
    let notificationDeliveryItems: T[] = [];
    const recipients = Array.from(dto.recipients);
    if (recipients.length === 0) {
      return [];
    }
    switch (dto.channelType) {
      case NotiCoreDeliveryChannelEnum.PUSH:
        notificationDeliveryItems = recipients.map((token) =>
          this.repository.create({
            channelType: dto.channelType,
            userId: dto.userId,
            recipient: token,
            payload: dto.payload,
            data: dto.data,
            ...(dto.priority === NotiCorePriorityEnum.HIGH
              ? { status: NotiCoreNotificationStatusEnum.PENDING }
              : {}),
            ...(dto.additionalData ? dto.additionalData : {}),
          } as T),
        );
        break;
      case NotiCoreDeliveryChannelEnum.SMS:
        notificationDeliveryItems = recipients.map((phone) =>
          this.repository.create({
            channelType: dto.channelType,
            userId: dto.userId,
            recipient: phone,
            payload: dto.payload,
            data: dto.data,
            ...(dto.priority === NotiCorePriorityEnum.HIGH
              ? { status: NotiCoreNotificationStatusEnum.PENDING }
              : {}),
            ...(dto.additionalData ? dto.additionalData : {}),
          } as T),
        );
        break;
      case NotiCoreDeliveryChannelEnum.EMAIL:
        notificationDeliveryItems = recipients.map((email) =>
          this.repository.create({
            channelType: dto.channelType,
            userId: dto.userId,
            recipient: email,
            data: dto.data,
            ...(dto.priority === NotiCorePriorityEnum.HIGH
              ? { status: NotiCoreNotificationStatusEnum.PENDING }
              : {}),
            payload: dto.payload,
            ...(dto.additionalData ? dto.additionalData : {}),
          } as T),
        );
        break;
      default: {
        const exhaustiveCheck: never = dto.channelType;
        throw new Error(`Invalid channel type: ${String(exhaustiveCheck)}`);
      }
    }

    const validNotifications = notificationDeliveryItems.filter((item) => item.recipient && item.payload);

    const dbNotifications = await this.repository.save(validNotifications);

    return dbNotifications;
  }

  async deliverCreatedNotifications(dto: DeliverCreatedNotificationRequestDto): Promise<T[]> {
    const notifications = await this.repository.find({
      where: {
        channelType: dto.channelType,
        status: NotiCoreNotificationStatusEnum.CREATED,
      } as FindOptionsWhere<T>,
      take: dto.limit,
      order: {
        updatedAt: 'ASC',
      } as FindOptionsOrder<T>,
    });

    if (notifications.length === 0) {
      return [];
    }

    await this.repository.update(
      { id: In(notifications.map((item) => item.id)) } as FindOptionsWhere<T>,
      { status: NotiCoreNotificationStatusEnum.PENDING } as unknown as QueryDeepPartialEntity<T>,
    );

    return notifications;
  }
  async retryFailedNotifications(dto: DeliverFailedNotificationRequestDto): Promise<T[]> {
    const notifications = await this.repository.find({
      where: {
        channelType: dto.channelType,
        status: NotiCoreNotificationStatusEnum.FAILED,
        retryCount: LessThanOrEqual(dto.maxDeliveryAttempts),
      } as FindOptionsWhere<T>,
      take: dto.limit,
      order: {
        updatedAt: 'ASC',
      } as FindOptionsOrder<T>,
    });

    if (notifications.length === 0) {
      return [];
    }

    await this.repository.update(
      { id: In(notifications.map((item) => item.id)) } as FindOptionsWhere<T>,
      {
        status: NotiCoreNotificationStatusEnum.PENDING,
        retryCount: () => 'retryCount + 1',
      } as unknown as QueryDeepPartialEntity<T>,
    );

    return notifications;
  }
  async checkDeadLineForPendingNotifications(dto: CheckForPendingNotificationRequestDto): Promise<void> {
    const notifications = await this.repository.find({
      where: {
        channelType: dto.channelType,
        status: NotiCoreNotificationStatusEnum.PENDING,
        updatedAt: Raw((alias) => `${alias} < NOW() - INTERVAL '${dto.checkDeadLineCronSeconds} seconds'`),
      } as FindOptionsWhere<T>,
      take: dto.limit,
      order: {
        updatedAt: 'ASC',
      } as FindOptionsOrder<T>,
    });

    if (notifications.length === 0) {
      return;
    }

    await this.repository.update(
      { id: In(notifications.map((item) => item.id)) } as FindOptionsWhere<T>,
      { status: NotiCoreNotificationStatusEnum.FAILED } as unknown as QueryDeepPartialEntity<T>,
    );
  }
  async deliverPendingNotifications(dto: DeliverPendingNotificationsRequestDto): Promise<T[]> {
    return await this.repository.find({
      where: {
        id: In(dto.ids),
        status: NotiCoreNotificationStatusEnum.PENDING,
      } as FindOptionsWhere<T>,
    });
  }

  async updateSuccessfullySentNotifications({
    successIds,
  }: UpdateSuccessfullySentNotificationsRequestDto): Promise<void> {
    await this.repository.update(
      { id: In(successIds) } as FindOptionsWhere<T>,
      {
        status: NotiCoreNotificationStatusEnum.SENT,
      } as unknown as QueryDeepPartialEntity<T>,
    );
  }

  async updateFailedNotifications({
    failedIds,
    errorMessage,
  }: UpdateFailedNotificationsRequestDto): Promise<void> {
    await this.repository.update(
      { id: In(failedIds) } as FindOptionsWhere<T>,
      {
        status: NotiCoreNotificationStatusEnum.FAILED,
        errorMessage,
      } as unknown as QueryDeepPartialEntity<T>,
    );
  }
}
