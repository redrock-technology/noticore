import { FCMConfigType, MailgunConfigType, SmsToConfigType } from '../interfaces';
import { FCMEdgeService } from '../message-senders';

export class NotiCoreNotificationConfigService {
  private static smsToConfig?: SmsToConfigType;
  private static fcmConfig?: FCMConfigType;
  private static emailConfig?: MailgunConfigType;

  static initializeSmsToConfig(config: SmsToConfigType): void {
    this.smsToConfig = config;
  }

  static initializeFCMConfig(config: FCMConfigType): void {
    this.fcmConfig = config;
    FCMEdgeService.initializeApp(config.serviceAccount);
  }
  static initializeEmailConfig(config: MailgunConfigType): void {
    this.emailConfig = config;
  }

  static getSmsToConfig(): SmsToConfigType | undefined {
    return this.smsToConfig;
  }

  static getFCMConfig(): FCMConfigType | undefined {
    return this.fcmConfig;
  }

  static getEmailConfig(): MailgunConfigType | undefined {
    return this.emailConfig;
  }
}
