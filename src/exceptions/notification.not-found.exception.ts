import { ServerException } from './server.exception';

export class NotificationNotFoundException extends ServerException {
  constructor() {
    super({
      information: {
        message: 'Notification not found',
        identifier: 'noticore.notification.notFound',
      },
    });
  }
}
