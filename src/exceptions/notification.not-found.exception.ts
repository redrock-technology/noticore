import { ServerException } from './server.exception';

export class NotiCoreNotificationNotFoundException extends ServerException {
  constructor() {
    super({
      information: {
        message: 'Notification not found',
        identifier: 'noticore.notification.notFound',
      },
    });
  }
}
