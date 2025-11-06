import { NotiCoreDeliveryChannelEnum } from '../enums';
import { ServerException } from './server.exception';

export class NotiCoreVendorMissConfigurationException extends ServerException {
  constructor(methodDescription: { channelType: NotiCoreDeliveryChannelEnum }) {
    super({
      information: {
        message: `no venders has been configured for delivery channel ${methodDescription.channelType}. You need to configure a vendor with NotificationConfigService. (eg: NotificationConfigService.initializeSmsToConfig({ providerToken, url }))`,
        identifier: 'noticore.vendor.missConfiguration',
      },
    });
  }
}
