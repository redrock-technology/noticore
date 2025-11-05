import { ObjectLiteral } from 'typeorm';
import { INotiCoreDeliveryEntity, INotiCoreNotificationEntity } from './notification-entity.interface';

export type NotiCoreNotificationObject = ObjectLiteral & INotiCoreNotificationEntity;
export type NotiCoreDeliveryObject = ObjectLiteral & INotiCoreDeliveryEntity;
