import { Repository } from 'typeorm';
import {
  INotiCoreEmailMessage,
  INotiCoreMessageSender,
  INotiCorePushMessage,
  INotiCoreSMSMessage,
  NotiCoreDeliveryObject,
  NotiCoreNotificationObject,
} from '../interfaces';
import {
  INotiCoreDeliveryMQEventPublisher,
  INotiCoreNotificationMQEventPublisher,
} from '../interfaces/mq.interface';
import { INotiCoreDeliveryRepository, INotiCoreNotificationRepository } from '../interfaces/repository.interface';
import { NotiCoreNotificationService } from '../services/notification.service';
import { NotiCoreNotificationRepositoryFactory, RepositoryOptionEnum } from './repository.factory';
import { INotiCoreResourceLock } from '../interfaces/resource-lock.interface';
import { NotiCoreMessageSenderFactory } from './message-sender.factory';
import { NotiCoreDeliveryChannelEnum } from '../enums';
import { NotiCoreDeliveryService } from '../services/delivery.service';

export interface INotificationServiceRecipe<T extends NotiCoreNotificationObject> {
  repository: INotiCoreNotificationRepository<T>;
  eventPublisher: INotiCoreNotificationMQEventPublisher;
}

export class NotificationServiceRecipe {
  /**
   *  you can use thisto introduce your custom repository and message queue
   *  for example:
   *  const recipe = NotificationServiceRecipe.customRecipe(
   *    new CustomNotificationRepository(),
   *    new CustomNotificationMQEventPublisher(),
   *  );
   *  const service = ServiceFactory.createNotificationService(recipe);
   */
  static customRecipe<T extends NotiCoreNotificationObject>(
    repository: INotiCoreNotificationRepository<T>,
    eventPublisher: INotiCoreNotificationMQEventPublisher,
  ): INotificationServiceRecipe<T> {
    return {
      repository,
      eventPublisher,
    };
  }

  /**
   *  you can use this to create a service with a typeorm repository and message queue
   *  for example:
   *  const recipe = NotificationServiceRecipe.typeORMRecipe(
   *    RepositoryOptionEnum.TYPEORM,
   *    new Repository<NotificationEntity>(),
   *    new NotificationMQEventPublisher(),
   *  );
   *  const service = ServiceFactory.createNotificationService(recipe);
   */
  static typeORMRecipe<T extends NotiCoreNotificationObject>(
    repositoryType: RepositoryOptionEnum,
    typeormRepository: Repository<T>,
    eventPublisher: INotiCoreNotificationMQEventPublisher,
  ): INotificationServiceRecipe<T> {
    const repository = NotiCoreNotificationRepositoryFactory.createNotificationRepository(
      repositoryType,
      typeormRepository,
    );
    return {
      repository,
      eventPublisher,
    };
  }
}

export interface INotificationDeliveryServiceRecipe<T extends NotiCoreDeliveryObject> {
  smsSender: INotiCoreMessageSender<INotiCoreSMSMessage>;
  fcmSender: INotiCoreMessageSender<INotiCorePushMessage>;
  emailSender: INotiCoreMessageSender<INotiCoreEmailMessage>;
  resourceLockService: INotiCoreResourceLock;
  eventPublisher: INotiCoreDeliveryMQEventPublisher;
  repository: INotiCoreDeliveryRepository<T>;
}

export class NotificationDeliveryServiceRecipe {
  /**
   *  you can use this to create a service with a custom repository and message queue
   *  for example:
   *  const recipe = NotificationDeliveryServiceRecipe.customRecipe(
   *    new CustomNotificationDeliveryRepository(),
   *    new CustomNotificationMQEventPublisher(),
   *  );
   *  const service = ServiceFactory.createNotificationDeliveryService(recipe);
   */
  static customRecipe<T extends NotiCoreDeliveryObject>({
    smsSender = NotiCoreMessageSenderFactory.createSender(NotiCoreDeliveryChannelEnum.SMS),
    fcmSender = NotiCoreMessageSenderFactory.createSender(NotiCoreDeliveryChannelEnum.PUSH),
    emailSender = NotiCoreMessageSenderFactory.createSender(NotiCoreDeliveryChannelEnum.EMAIL),
    resourceLockService,
    eventPublisher,
    repository,
  }: {
    smsSender: INotiCoreMessageSender<INotiCoreSMSMessage>;
    fcmSender: INotiCoreMessageSender<INotiCorePushMessage>;
    emailSender: INotiCoreMessageSender<INotiCoreEmailMessage>;
    resourceLockService: INotiCoreResourceLock;
    eventPublisher: INotiCoreDeliveryMQEventPublisher;
    repository: INotiCoreDeliveryRepository<T>;
  }): INotificationDeliveryServiceRecipe<T> {
    return {
      smsSender,
      fcmSender,
      emailSender,
      resourceLockService,
      eventPublisher,
      repository,
    };
  }

  /**
   *  you can use this to create a service with a typeorm repository and message queue
   *  for example:
   *  const recipe = NotificationDeliveryServiceRecipe.typeORMRecipe(
   *    RepositoryOptionEnum.TYPEORM,
   *    new Repository<NotificationDeliveryEntity>(),
   *    new Repository<NotificationEntity>(),
   *    new NotificationMQEventPublisher(),
   *  );
   *  const service = ServiceFactory.createNotificationDeliveryService(recipe);
   */
  static typeORMRecipe<T extends NotiCoreDeliveryObject>({
    smsSender = NotiCoreMessageSenderFactory.createSender(NotiCoreDeliveryChannelEnum.SMS),
    fcmSender = NotiCoreMessageSenderFactory.createSender(NotiCoreDeliveryChannelEnum.PUSH),
    emailSender = NotiCoreMessageSenderFactory.createSender(NotiCoreDeliveryChannelEnum.EMAIL),
    resourceLockService,
    eventPublisher,
    repositoryType,
    typeormNotificationDeliveryRepository,
  }: {
    smsSender: INotiCoreMessageSender<INotiCoreSMSMessage>;
    fcmSender: INotiCoreMessageSender<INotiCorePushMessage>;
    emailSender: INotiCoreMessageSender<INotiCoreEmailMessage>;
    resourceLockService: INotiCoreResourceLock;
    eventPublisher: INotiCoreDeliveryMQEventPublisher;
    repositoryType: RepositoryOptionEnum;
    typeormNotificationDeliveryRepository: Repository<T>;
  }): INotificationDeliveryServiceRecipe<T> {
    const repository = NotiCoreNotificationRepositoryFactory.createNotificationDeliveryRepository(
      repositoryType,
      typeormNotificationDeliveryRepository,
    );
    return {
      smsSender,
      fcmSender,
      emailSender,
      resourceLockService,
      eventPublisher,
      repository,
    };
  }
}

export class NotiCoreServiceFactory {
  static createNotificationService<T extends NotiCoreNotificationObject>(
    recipe: INotificationServiceRecipe<T>,
  ): NotiCoreNotificationService<T> {
    return new NotiCoreNotificationService(recipe.repository, recipe.eventPublisher);
  }

  static createDeliveryService<T extends NotiCoreDeliveryObject>(
    recipe: INotificationDeliveryServiceRecipe<T>,
  ): NotiCoreDeliveryService<T> {
    return new NotiCoreDeliveryService(
      recipe.smsSender,
      recipe.fcmSender,
      recipe.emailSender,
      recipe.resourceLockService,
      recipe.eventPublisher,
      recipe.repository,
    );
  }
}
