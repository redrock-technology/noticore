import { FCMEdgeService, MailgunEdgeService, SmsToEdgeService } from '../message-senders';
import { NotiCoreDeliveryChannelEnum } from '../enums';
import { NotiCoreVendorMissConfigurationException } from '../exceptions/vendor.miss-configuration.exception';
import { INotiCoreMessageSender, INotiCoreNotificationMessagePayload } from '../interfaces';
import { NotiCoreNotificationConfigService } from '../services/config.service';

/**
 * Factory for creating message senders for different delivery channels.
 * This will create edge services for the delivery channels
 * The edge services must configure before use by NotiCoreNotificationConfigService.initializeSmsToConfig, initializeFCMConfig or initializeEmailConfig
 */
export class NotiCoreMessageSenderFactory {
  static createSender(type: NotiCoreDeliveryChannelEnum): INotiCoreMessageSender<INotiCoreNotificationMessagePayload> {
    switch (type) {
      case NotiCoreDeliveryChannelEnum.EMAIL: {
        const emailConfig = NotiCoreNotificationConfigService.getEmailConfig();
        if (!emailConfig) {
          throw new NotiCoreVendorMissConfigurationException({ channelType: type });
        }
        return new MailgunEdgeService(emailConfig);
      }
      case NotiCoreDeliveryChannelEnum.SMS: {
        const smsToConfig = NotiCoreNotificationConfigService.getSmsToConfig();
        if (!smsToConfig) {
          throw new NotiCoreVendorMissConfigurationException({ channelType: type });
        }
        return new SmsToEdgeService(smsToConfig);
      }
      case NotiCoreDeliveryChannelEnum.PUSH: {
        const fcmConfig = NotiCoreNotificationConfigService.getFCMConfig();
        if (!fcmConfig) {
          throw new NotiCoreVendorMissConfigurationException({ channelType: type });
        }
        return new FCMEdgeService();
      }
      default: {
        const exhaustiveCheck: never = type;
        throw new Error(`Invalid channel type: ${String(exhaustiveCheck)}`);
      }
    }
  }
}
