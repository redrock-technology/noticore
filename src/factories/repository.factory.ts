import { Repository } from 'typeorm';
import { NotiCoreDeliveryObject, NotiCoreNotificationObject } from '../interfaces';
import {
  NotiCoreDeliveryTypeORMRepository,
  NotiCoreNotificationTypeORMRepository,
} from '../repositories/typeorm';
import { INotiCoreDeliveryRepository, INotiCoreNotificationRepository } from '../interfaces/repository.interface';

export enum RepositoryOptionEnum {
  TYPEORM = 'typeorm',
}

export class NotiCoreNotificationRepositoryFactory {
  static createNotificationRepository<T extends NotiCoreNotificationObject>(
    repositoryType: RepositoryOptionEnum,
    repository: Repository<T>,
  ): INotiCoreNotificationRepository<T> {
    switch (repositoryType) {
      case RepositoryOptionEnum.TYPEORM:
        return new NotiCoreNotificationTypeORMRepository(repository);
      default:
        const _exhaustiveCheck: never = repositoryType as never;
        throw _exhaustiveCheck;
    }
  }

  static createNotificationDeliveryRepository<T extends NotiCoreDeliveryObject>(
    repositoryType: RepositoryOptionEnum,
    repository: Repository<T>,
  ): INotiCoreDeliveryRepository<T> {
    switch (repositoryType) {
      case RepositoryOptionEnum.TYPEORM:
        return new NotiCoreDeliveryTypeORMRepository(repository);
      default:
        const _exhaustiveCheck: never = repositoryType as never;
        throw _exhaustiveCheck;
    }
  }
}
