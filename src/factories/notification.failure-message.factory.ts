export enum NotificationFailureReason {
  NO_NOTIFIABLE_CHANNEL = 'NO_NOTIFIABLE_CHANNEL',
  UNKNOWN = 'UNKNOWN',
}
export class NotificationFailureMessageFactory {
  static getMessage(reason: NotificationFailureReason): string {
    switch (reason) {
      case NotificationFailureReason.NO_NOTIFIABLE_CHANNEL:
        return 'No notifiable channel for this notification.';

      default:
        return 'Unknown failure reason.';
    }
  }
}
