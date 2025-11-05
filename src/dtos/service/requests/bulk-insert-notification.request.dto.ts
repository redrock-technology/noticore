import { NotiCoreNotificationObject } from '../../../interfaces/entity.interface';
import { INotiCoreCreateNotificationMqDto } from '../../../interfaces/mq.interface';

export class BulkInsertNotificationServiceRequestDto<T extends NotiCoreNotificationObject> {
  notifications: T[];
  mqCustomPayloadFactory?: (notifications: T[]) => INotiCoreCreateNotificationMqDto[];
}
