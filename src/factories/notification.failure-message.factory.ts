export enum NotiCoreNotificationFailureReason {
  NO_NOTIFIABLE_CHANNEL = 'NO_NOTIFIABLE_CHANNEL',
  UNKNOWN = 'UNKNOWN',
}
export class NotiCoreNotificationFailureMessageFactory {
  static getMessage(reason: NotiCoreNotificationFailureReason): string {
    switch (reason) {
      case NotiCoreNotificationFailureReason.NO_NOTIFIABLE_CHANNEL:
        return 'No notifiable channel for this notification.';

      default:
        return 'Unknown failure reason.';
    }
  }
}
