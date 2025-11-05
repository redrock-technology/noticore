import {
  Between,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Not,
  Or,
  Raw,
  Repository,
} from 'typeorm';
import { INotiCorePaginationResponse } from '../../interfaces/pagination.interface';
import { NotiCoreNotificationObject } from '../../interfaces';
import { NotiCoreNotificationStatusEnum } from '../../enums';
import { NotificationNotFoundException } from '../../exceptions/notification.not-found.exception';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  NotificationFailureMessageFactory,
  NotificationFailureReason,
} from '../../factories/notification.failure-message.factory';
import { INotiCoreNotificationRepository } from '../../interfaces/repository.interface';
import {
  DeleteNotificationForUserDeletedPartitionRequestDto,
  FindOneNotificationRequestDto,
  FindPendingNotificationRequestDto,
  GetNotificationRequestDto,
  ReferenceDeletedNotificationRequestDto,
  UpdateNotificationRequestDto,
  UserDeletedNotificationRequestDto,
} from '../../dtos/repository/requests';

/**
 * Repository for the NotificationEntity
 * @template T - The type of the NotificationEntity
 */
export class NotiCoreNotificationTypeORMRepository<T extends NotiCoreNotificationObject>
  implements INotiCoreNotificationRepository<T>
{
  constructor(private readonly repository: Repository<T>) {}

  async bulkInsert(records: T[]): Promise<T[]> {
    const result = await this.repository.save(records);
    return result;
  }

  async getnotifications(dto: GetNotificationRequestDto): Promise<INotiCorePaginationResponse<T>> {
    const [data, count] = await this.repository.findAndCount({
      where: dto.where
        ? dto.where
        : {
            ...(dto.userId ? { userId: dto.userId } : {}),
            ...(dto.from && dto.to ? { createdAt: Between(dto.from, dto.to) } : {}),
          },
      order: {
        createdAt: dto.order,
      } as FindOptionsOrder<T>,
      skip: dto.limit * (dto.page - 1),
      take: dto.limit,
      relations: Array.from(dto.relations),
    });

    return {
      data,
      count,
    };
  }

  async findOne(dto: FindOneNotificationRequestDto): Promise<T | null> {
    const notification = await this.repository.findOne({
      where: dto.where
        ? dto.where
        : ({
            id: dto.id,
            ...(dto.userId ? { userId: dto.userId } : {}),
          } as FindOptionsWhere<T>),
      ...(dto.relations ? { relations: Array.from(dto.relations) } : {}),
    });

    if (!notification && dto.throwError) {
      throw new NotificationNotFoundException();
    }

    return notification;
  }

  async setAsNotified(dto: UpdateNotificationRequestDto): Promise<void> {
    const notification = await this.findOne({ id: dto.id, throwError: true });

    await this.repository.update(
      { id: notification?.id } as FindOptionsWhere<T>,
      { status: NotiCoreNotificationStatusEnum.SENT } as unknown as QueryDeepPartialEntity<T>,
    );
  }

  async setAsFailed(dto: UpdateNotificationRequestDto): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update({
        errorMessage: dto.errorReason
          ? NotificationFailureMessageFactory.getMessage(dto.errorReason)
          : NotificationFailureMessageFactory.getMessage(NotificationFailureReason.UNKNOWN),
        status: NotiCoreNotificationStatusEnum.FAILED,
        retryCount: () => 'retryCount + 1',
        retryAt: null,
      } as QueryDeepPartialEntity<T>)
      .where({ id: dto.id })
      .execute();
  }

  async setForRetry(dto: UpdateNotificationRequestDto): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update({
        retryCount: () => 'retryCount + 1',
        retryAt: () => `CURRENT_TIMESTAMP + INTERVAL '${dto.delay} seconds'`,
        errorMessage: dto.errorReason
          ? NotificationFailureMessageFactory.getMessage(dto.errorReason)
          : NotificationFailureMessageFactory.getMessage(NotificationFailureReason.UNKNOWN),
      } as QueryDeepPartialEntity<T>)
      .where({ id: dto.id })
      .execute();
  }

  async findPendings(dto: FindPendingNotificationRequestDto): Promise<T[]> {
    return this.repository.find({
      where: dto.where
        ? dto.where
        : ({
            id: dto.exclude && dto.exclude.length > 0 ? Not(In(dto.exclude)) : undefined,
            status: NotiCoreNotificationStatusEnum.CREATED,
            retryCount: LessThan(dto.maxRetryCount),
            retryAt: Or(
              Raw((alias) => `${alias} < CURRENT_TIMESTAMP`),
              IsNull(),
            ),
          } as FindOptionsWhere<T>),
      take: dto.take,
      ...(dto.order ? { order: dto.order as FindOptionsOrder<T> } : {}),
    });
  }

  async handleReferenceDeleted(dto: ReferenceDeletedNotificationRequestDto): Promise<void> {
    const froundNotifications = await this.repository.find({
      where: dto.where
        ? dto.where
        : {
            referenceId: dto.referenceId,
          },
      take: dto.partitionSize,
      select: dto.select ?? ['id'],
    });

    if (froundNotifications.length === 0) return;

    await this.repository.delete({
      id: In(froundNotifications.map((notification) => notification.id)),
    } as FindOptionsWhere<T>);
  }

  async handleUserDeleted(dto: UserDeletedNotificationRequestDto): Promise<
    {
      id: string;
      userId: string;
      targetUserId: string;
    }[]
  > {
    const results = await this.repository
      .createQueryBuilder()
      .select('DISTINCT ON (filtered.rn_group) filtered.id', 'id')
      .addSelect('filtered."userId"', 'userId')
      .addSelect('filtered."targetUserId"', 'targetUserId')
      .from(
        `(
            SELECT 
              f.*,
              FLOOR((ROW_NUMBER() OVER (ORDER BY f.id ASC) - 1) / :interval) as rn_group
            FROM (
              (SELECT id, "userId", "targetUserId" FROM notification WHERE "userId" = :userId)
              UNION
              (SELECT id, "userId", "targetUserId" FROM notification WHERE "targetUserId" = :userId)
            ) f
          )`,
        'filtered',
      )
      .orderBy('filtered.rn_group', 'ASC')
      .addOrderBy('filtered.id', 'ASC')
      .setParameter('interval', dto.partitionSize)
      .setParameter('userId', dto.userId)
      .getRawMany();

    return results;
  }

  async handleUserDeletedPartitionCreated(
    dto: DeleteNotificationForUserDeletedPartitionRequestDto,
  ): Promise<void> {
    const { userId, traceId, lastId } = dto;

    const totalNotifications = await this.repository.find({
      where: dto.where
        ? dto.where
        : [
            {
              userId,
              id: lastId ? Between(traceId, lastId) : MoreThanOrEqual(traceId),
            },
          ],
      order: {
        id: 'ASC',
      } as FindOptionsOrder<T>,
      take: 1000,
      select: ['id', 'userId'],
    });

    if (totalNotifications.length === 0) {
      return;
    }

    await this.repository.delete({
      id: In(totalNotifications.map((notification) => notification.id)),
    } as FindOptionsWhere<T>);
  }
}
