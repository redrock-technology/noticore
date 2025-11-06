import { NotiCoreFCMConfigType, NotiCoreMailgunConfigType, NotiCoreSmsToConfigType } from '../interfaces';
import { FCMEdgeService } from '../message-senders';

export class NotiCoreNotificationConfigService {
  private static smsToConfig?: NotiCoreSmsToConfigType;
  private static fcmConfig?: NotiCoreFCMConfigType;
  private static emailConfig?: NotiCoreMailgunConfigType;

  static initializeSmsToConfig(config: NotiCoreSmsToConfigType): void {
    this.smsToConfig = config;
  }

  static initializeFCMConfig(config: NotiCoreFCMConfigType): void {
    this.fcmConfig = config;
    FCMEdgeService.initializeApp(config.serviceAccount);
  }
  static initializeEmailConfig(config: NotiCoreMailgunConfigType): void {
    this.emailConfig = config;
  }

  static getSmsToConfig(): NotiCoreSmsToConfigType | undefined {
    return this.smsToConfig;
  }

  static getFCMConfig(): NotiCoreFCMConfigType | undefined {
    return this.fcmConfig;
  }

  static getEmailConfig(): NotiCoreMailgunConfigType | undefined {
    return this.emailConfig;
  }
}
