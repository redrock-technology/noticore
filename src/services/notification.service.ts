import { INotiCoreNotificationRepository } from '../interfaces/repository.interface';
import { NotiCoreNotificationObject } from '../interfaces';
import { INotiCoreNotificationMQEventPublisher } from '../interfaces/mq.interface';
import { INotiCorePaginationResponse } from '../interfaces/pagination.interface';
import {
  NotiCoreFindOneNotificationRequestDto,
  NotiCoreFindPendingNotificationRequestDto,
  NotiCoreGetNotificationRequestDto,
  NotiCoreUpdateNotificationRequestDto,
} from '../dtos/repository/requests';
import {
  ReferenceDeletedNotificationServiceRequestDto,
  UserDeletedNotificationDeletePartitionServiceRequestDto,
  UserDeletedNotificationServiceRequestDto,
  BulkInsertNotificationServiceRequestDto,
} from '../dtos/service/requests';

/**
 * Coordinates notification domain operations and emits MQ events for downstream processing.
 *
 * Responsibilities:
 * - Persist/fetch/update notification records via the repository
 * - Publish events when notifications are created or reference/user records are deleted
 * - Provide pagination, lookup, and status transition helpers
 *
 * T: concrete Notification entity shape used by the repository
 */
export class NotiCoreNotificationService<T extends NotiCoreNotificationObject> {
  constructor(
    private readonly repository: INotiCoreNotificationRepository<T>,
    private readonly eventPublisher: INotiCoreNotificationMQEventPublisher,
  ) {}

  /**
   * Inserts multiple notifications and publishes a creation event per notification, and schedule them for sending
   *
   * @param dto - contains notifications and an optional MQ payload factory to customize event messages
   */
  async bulkInsert(dto: BulkInsertNotificationServiceRequestDto<T>): Promise<void> {
    const notifications = await this.repository.bulkInsert(dto.notifications);

    const messages = dto.mqCustomPayloadFactory
      ? dto.mqCustomPayloadFactory(notifications)
      : notifications.map((notification) => ({
          notificationId: notification.id,
          userId: notification.userId,
        }));

    await this.eventPublisher.publishNotificationCreated(messages);
  }

  /**
   * Returns a paginated list of notifications for a user with optional ordering and relations.
   *
   * @param dto - pagination, ordering, relations and user context
   */
  async getNotifications(dto: NotiCoreGetNotificationRequestDto): Promise<INotiCorePaginationResponse<T>> {
    return await this.repository.getnotifications({
      limit: dto.limit,
      page: dto.page,
      order: dto.order,
      relations: dto.relations,
      userId: dto.userId,
      where: dto.where,
      from: dto.from,
      to: dto.to,
    });
  }

  /**
   * Finds a single notification by criteria.
   * @param dto - lookup criteria
   */
  async findOne(dto: NotiCoreFindOneNotificationRequestDto): Promise<T | null> {
    return await this.repository.findOne(dto);
  }

  /**
   * Marks a notification as NOTIFIED.
   * @param dto - id and optional extra fields to update
   */
  async setAsNotified(dto: NotiCoreUpdateNotificationRequestDto): Promise<void> {
    return await this.repository.setAsNotified(dto);
  }

  /**
   * Marks a notification as FAILED with an optional error message.
   * @param dto - id and optional error info
   */
  async setAsFailed(dto: NotiCoreUpdateNotificationRequestDto): Promise<void> {
    return await this.repository.setAsFailed(dto);
  }

  /**
   * Schedules a notification for retry.
   * @param dto - id and retry metadata
   */
  async setForRetry(dto: NotiCoreUpdateNotificationRequestDto): Promise<void> {
    return this.repository.setForRetry(dto);
  }

  /**
   * Retrieves pending notifications constrained by repository settings.
   * @param dto - filtering and limit options
   */
  async findPendings(dto: NotiCoreFindPendingNotificationRequestDto): Promise<T[]> {
    return await this.repository.findPendings(dto);
  }

  /**
   * Handles deletion of a reference entity and publishes an MQ event to continue cleanup.
   * @param dto - identifies the reference and allows custom MQ payload
   */
  async handleReferenceDeleted(dto: ReferenceDeletedNotificationServiceRequestDto): Promise<void> {
    await this.repository.handleReferenceDeleted(dto);

    await this.eventPublisher.publishNotificationReferenceDeleted({
      referenceId: dto.referenceId,
      ...(dto.mqCustomPayload ? dto.mqCustomPayload : {}),
    });
  }

  /**
   * Initiates user-deletion cleanup, partitions affected notifications, and publishes partition events.
   * @param dto - user id and partition size for batch deletion
   */
  async handleUserDeleted(dto: UserDeletedNotificationServiceRequestDto): Promise<void> {
    const results: {
      id: string;
      userId: string;
      targetUserId: string;
    }[] = await this.repository.handleUserDeleted({
      partitionSize: dto.partitionSize,
      userId: dto.userId,
    });

    if (results.length === 0) return;

    await this.eventPublisher.publishUserDeletedNotificationDeletePartition(
      results.map((result, index) => {
        return {
          userId: result.userId,
          traceId: result.id,
          lastId: index === results.length - 1 ? undefined : results[index + 1].id,
        };
      }),
    );
  }

  /**
   * Finalizes deletion cleanup for a user partition.
   * @param dto - partition context
   */
  async handleUserDeletedPartitionCreated(
    dto: UserDeletedNotificationDeletePartitionServiceRequestDto,
  ): Promise<void> {
    await this.repository.handleUserDeletedPartitionCreated(dto);
  }
}
