import { INotiCoreDeliveryMQEventPublisher } from '../interfaces/mq.interface';
import { INotiCoreResourceLock } from '../interfaces/resource-lock.interface';
import { IEmailSender, IFCMSender, ISMSSender, NotiCoreDeliveryObject } from '../interfaces';
import { INotiCoreDeliveryRepository } from '../interfaces/repository.interface';
import { NotiCoreDeliveryChannelEnum, NotiCoreNotificationStatusEnum, NotiCorePriorityEnum } from '../enums';
import {
  CheckForPendingNotificationServiceRequestDto,
  CreateNotificationDeliveryServiceRequestDto,
  DeliverCreatedNotificationServiceRequestDto,
  DeliverFailedNotificationServiceRequestDto,
  DeliverPendingNotificationsServiceRequestDto,
  ScheduleForSendServiceRequestDto,
  SendNotificationServiceDto,
} from '../dtos/service/requests';

/**
 * Orchestrates notification delivery lifecycle across channels (PUSH, SMS, EMAIL).
 *
 * Responsibilities:
 * - Create notification-delivery records for channel-specific recipients
 * - Lock-based scheduling to avoid duplicate workers operating the same batch
 * - Transition notifications through statuses (CREATED -> PENDING -> SENT/FAILED)
 * - Dispatch send jobs to queue or send immediately when required
 * - Handle vendor-specific results (e.g., invalid FCM tokens) and persist outcomes
 *
 * T: concrete NotificationDelivery entity shape used by the repository
 * K: concrete Notification entity shape used by the repository
 */
export class NotiCoreDeliveryService<T extends NotiCoreDeliveryObject> {
  constructor(
    private readonly smsSender: ISMSSender,
    private readonly fcmSender: IFCMSender,
    private readonly emailSender: IEmailSender,
    private readonly resourceLockService: INotiCoreResourceLock,
    private readonly eventPublisher: INotiCoreDeliveryMQEventPublisher,
    private repository: INotiCoreDeliveryRepository<T>,
  ) {}

  /**
   * Creates channel-specific delivery rows for the provided request.
   * If priority is HIGH, immediately attempts sending and status updates.
   *
   * @param dto - request containing channel type, recipients, payload, metadata, and priority
   * @returns Promise<void>
   */
  async create(dto: CreateNotificationDeliveryServiceRequestDto): Promise<void> {
    const notifications = await this.repository.create({
      ...dto,
    });

    if (dto.priority === NotiCorePriorityEnum.HIGH) {
      await this.sendNotificationsAndUpdateStatus({
        notifications,
        handleInvalidFCMTokens: dto.handleInvalidFCMTokens,
      });
    }
  }

  /**
   * Expands a newly created high-level notification into channel-specific delivery records.
   * Validates notifiable channels and returns saved delivery rows.
   *
   * @param dto - contains notification id and message factory
   * @returns Saved delivery records
   */
  async handleNotificationCreated(dto: CreateNotificationDeliveryServiceRequestDto): Promise<T[]> {
    const notifications = await this.repository.create({
      ...dto,
    });

    const pendingNotifications = notifications.filter(
      (item) => item.status === NotiCoreNotificationStatusEnum.PENDING,
    );
    if (pendingNotifications.length > 0) {
      await this.sendNotificationsAndUpdateStatus({
        notifications: pendingNotifications,
        handleInvalidFCMTokens: dto.handleInvalidFCMTokens,
      });
    }
    return notifications;
  }

  /**
   * Moves a batch of CREATED deliveries to PENDING and schedules them for sending.
   * A lock ensures only one worker processes a given channel concurrently.
   *
   * @param dto - channel and batching parameters with lock TTL
   */
  async deliverCreatedNotifications(dto: DeliverCreatedNotificationServiceRequestDto): Promise<void> {
    const lock = await this.resourceLockService.acquireLock({
      key: `notification:delivery:created:${dto.channelType}`,
      ttl: dto.lockTTL,
    });

    if (!lock) {
      return;
    }

    const notifications = await this.repository.deliverCreatedNotifications(dto);

    if (notifications.length === 0) {
      await this.resourceLockService.releaseLock(lock);
      return;
    }

    try {
      await this.scheduleForSend({
        channelType: dto.channelType,
        notifications: notifications,
      });
    } finally {
      await this.resourceLockService.releaseLock(lock);
    }
  }
  /**
   * Retries FAILED deliveries up to a configured maximum and schedules them for sending.
   * Guarded by a channel-scoped lock.
   *
   * @param dto - includes max delivery attempts, lock TTL, and batching settings
   */
  async retryFailedNotifications(dto: DeliverFailedNotificationServiceRequestDto): Promise<void> {
    const lock = await this.resourceLockService.acquireLock({
      key: `notification:delivery:retry-failed:${dto.channelType}`,
      ttl: dto.lockTTL,
    });

    if (!lock) {
      return;
    }

    const notifications = await this.repository.retryFailedNotifications(dto);

    if (notifications.length === 0) {
      await this.resourceLockService.releaseLock(lock);
      return;
    }

    try {
      await this.scheduleForSend({
        channelType: dto.channelType,
        notifications: notifications,
      });
    } finally {
      await this.resourceLockService.releaseLock(lock);
    }
  }

  /**
   * Marks PENDING deliveries as FAILED when they exceed the allowed deadline.
   * Ensures single-run semantics via a channel-scoped lock.
   *
   * @param dto - includes channel, limit, deadline window and lock TTL
   */
  async checkDeadLineForPendingNotifications(
    dto: CheckForPendingNotificationServiceRequestDto,
  ): Promise<void> {
    const lock = await this.resourceLockService.acquireLock({
      key: `notification:delivery:check-dead-line:${dto.channelType}`,
      ttl: dto.lockTTL,
    });
    if (!lock) {
      return;
    }

    await this.repository.checkDeadLineForPendingNotifications(dto);

    await this.resourceLockService.releaseLock(lock);
  }
  /**
   * Loads PENDING deliveries by ids and attempts to send immediately.
   * Skips when there are no matching items.
   *
   * @param dto - list of delivery ids and invalid-token handler
   */
  async deliverPendingNotifications(dto: DeliverPendingNotificationsServiceRequestDto): Promise<void> {
    const notifications = await this.repository.deliverPendingNotifications({
      ...dto,
    });

    if (notifications.length === 0) {
      return;
    }

    await this.sendNotificationsAndUpdateStatus({
      notifications,
      handleInvalidFCMTokens: dto.handleInvalidFCMTokens,
    });
  }

  /**
   * Publishes queue events for downstream workers to process sending by channel.
   * For PUSH/EMAIL: batches ids; for SMS: publishes one-per-item.
   *
   * @param dto - channel and notifications to schedule
   */
  private async scheduleForSend(dto: ScheduleForSendServiceRequestDto<T>): Promise<void> {
    switch (dto.channelType) {
      case NotiCoreDeliveryChannelEnum.PUSH: {
        await this.eventPublisher.publishNotificationScheduled([
          {
            notificationIds: dto.notifications.map((item) => item.id),
          },
        ]);
        break;
      }
      case NotiCoreDeliveryChannelEnum.SMS: {
        await this.eventPublisher.publishNotificationScheduled(
          dto.notifications.map((item) => {
            return {
              notificationIds: [item.id],
            };
          }),
        );
        break;
      }
      case NotiCoreDeliveryChannelEnum.EMAIL: {
        // [TODO]: check this maybe we should send each email separately or in smaller batches
        await this.eventPublisher.publishNotificationScheduled([
          {
            notificationIds: dto.notifications.map((item) => item.id),
          },
        ]);
        break;
      }
      default: {
        const exhaustiveCheck: never = dto.channelType;
        throw new Error(`Invalid channel type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Groups deliveries by channel and sends them via the appropriate sender.
   * Updates persistence with SENT/FAILED status and aggregates error messages.
   * For PUSH, also reports invalid FCM tokens to the provided handler.
   *
   * @param dto - deliveries to send and invalid-token handler
   */
  async sendNotificationsAndUpdateStatus(dto: SendNotificationServiceDto<T>): Promise<void> {
    const pushNotifications: T[] = [];
    const smsNotifications: T[] = [];
    const emailNotifications: T[] = [];

    dto.notifications.forEach((item) => {
      switch (item.channelType) {
        case NotiCoreDeliveryChannelEnum.PUSH: {
          pushNotifications.push(item);
          break;
        }
        case NotiCoreDeliveryChannelEnum.SMS: {
          smsNotifications.push(item);
          break;
        }
        case NotiCoreDeliveryChannelEnum.EMAIL: {
          emailNotifications.push(item);
          break;
        }
        default: {
          const exhaustiveCheck: never = item.channelType;
          throw new Error(`Invalid channel type: ${String(exhaustiveCheck)}`);
        }
      }
    });

    if (pushNotifications.length) {
      try {
        const sendResults = await this.fcmSender.sendEach(
          pushNotifications.map((item) => {
            return {
              type: NotiCoreDeliveryChannelEnum.PUSH,
              id: item.id,
              payload: {
                title: item.payload.title ?? '',
                body: item.payload.body,
                imageUrl: item.payload.imageUrl,
              },
              data: item.data,
              recipient: item.recipient,

              // [TODO]: need to see how we should fill this apns
              // apns?: {
              //   mutableContent: number;
              //   contentAvailable: number;
              //   badge: number;
              // }
            };
          }),
        );
        const updatedNotifications = sendResults.map((item) => ({
          id: item.id,
          fcmToken: item.token,
          status: item.success ? NotiCoreNotificationStatusEnum.SENT : NotiCoreNotificationStatusEnum.FAILED,
          errorMessage: item.success ? null : item.errorMessage,
          errorCode: item.success ? null : item.errorCode,
        }));

        const invalidTokenErrorCodes = [
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
          'messaging/mismatched-credential',
        ];
        const failedNotificationIds: string[] = [];
        const invalidTokens: string[] = [];
        const successIds: string[] = [];
        updatedNotifications.forEach((item) => {
          if (item.status === NotiCoreNotificationStatusEnum.FAILED) {
            failedNotificationIds.push(item.id);
            if (invalidTokenErrorCodes.includes(item.errorCode ?? '')) {
              invalidTokens.push(item.fcmToken);
            }
          } else if (item.status === NotiCoreNotificationStatusEnum.SENT) {
            successIds.push(item.id);
          }
        });

        //update success notifications
        await this.repository.updateSuccessfullySentNotifications({
          successIds,
        });

        if (invalidTokens.length) {
          await dto.handleInvalidFCMTokens(invalidTokens);
        }

        await this.repository.updateFailedNotifications({
          failedIds: failedNotificationIds,
          errorMessage: updatedNotifications
            .filter((item) => item.status === NotiCoreNotificationStatusEnum.FAILED)
            .map((item) => `${item.id}: ${item.errorMessage}`)
            .join(','),
        });
      } catch (error) {
        await this.repository.updateFailedNotifications({
          failedIds: pushNotifications.map((item) => item.id),
          errorMessage: error.message,
        });
      }
    }

    if (smsNotifications.length) {
      const promises = smsNotifications.map(async (item) => {
        try {
          await this.smsSender.send({
            type: NotiCoreDeliveryChannelEnum.SMS,
            payload: {
              body: item.payload.body,
            },
            recipient: item.recipient,
          });
          await this.repository.updateSuccessfullySentNotifications({
            successIds: [item.id],
          });
        } catch (error) {
          await this.repository.updateFailedNotifications({
            failedIds: [item.id],
            errorMessage: error.message,
          });
        }
      });
      await Promise.all(promises);
    }

    if (emailNotifications.length) {
      try {
        await this.emailSender.sendEach(
          emailNotifications.map((item) => {
            return {
              type: NotiCoreDeliveryChannelEnum.EMAIL,
              id: item.id,
              payload: {
                title: item.payload.title ?? '',
                body: item.payload.body,
              },
              data: item.data,
              recipient: item.recipient,
            };
          }),
        );
        // const updatedNotifications = sendResults.map((item) => ({
        //   id: item.data.id,
        //   status: item.success ? NotificationStatusEnum.SENT : NotificationStatusEnum.FAILED,
        //   errorMessage: item.success ? null : `${item.data.message} Details: ${item.data.details}`,
        //   errorCode: item.success ? null : item.data.status.toString(),
        // }));

        //TODO: handle errors of email
        //update success notifications
        await this.repository.updateSuccessfullySentNotifications({
          successIds: emailNotifications.map((item) => item.id),
        });
      } catch (error) {
        await this.repository.updateFailedNotifications({
          failedIds: pushNotifications.map((item) => item.id),
          errorMessage: error.message,
        });
      }
    }
  }
}
