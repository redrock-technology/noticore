import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { IFCMSender, IMessageSender, IPushMessage } from '../interfaces';

/**
 * This edge service integrates with the Firebase Cloud Messaging (FCM) API (https://firebase.google.com/docs/cloud-messaging)
 * to send push notifications to devices.
 * It uses the Firebase Admin SDK to send notifications to devices.
 * It is used to send push notifications to devices.
 */
@Injectable()
export class FCMEdgeService implements IMessageSender<IPushMessage>, IFCMSender {
  static admin: admin.app.App;

  /**
   * Initialize the Firebase Admin SDK.
   * @param serviceAccount - The service account to use to authenticate with the Firebase Admin SDK.
   */
  static initializeApp(serviceAccount: admin.ServiceAccount): void {
    if (FCMEdgeService.admin) {
      return;
    }
    try {
      FCMEdgeService.admin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error(
        {
          message: 'Error initializing Firebase:',
          error,
          info: {
            errorMessage: error.message,
          },
        },
        FCMEdgeService.name,
      );
      throw error;
    }
  }

  /**
   * inorder to remove firebase app
   */
  static async deleteApp() {
    await FCMEdgeService.admin.delete();
  }

  /**
   * Sends multiple push notifications to devices in batch using FCM.
   * @param notifications - Array of PushMessageType objects containing notification details:
   *                       - recipient: Device token to send notification to
   *                       - payload: Contains title, body and optional imageUrl
   *                       - data: Optional additional data to send with notification
   *                       - apns: Optional Apple Push Notification Service specific configuration
   *                              - mutableContent: Whether notification content can be modified
   *                              - contentAvailable: Whether to wake app in background
   *                              - badge: Number to display on app icon
   * @returns Array of objects containing send results for each notification:
   *          - success: Whether send was successful
   *          - errorMessage: Error message if send failed
   *          - errorCode: Error code if send failed
   *          - id: Original notification ID
   *          - token: Device token notification was sent to
   */
  async sendEach(messages: IPushMessage[]): Promise<
    {
      success: boolean;
      errorMessage?: string;
      errorCode?: string;
      id: string;
      token: string;
    }[]
  > {
    const sendResult = await getMessaging().sendEach(
      messages.map((item) => ({
        token: item.recipient,
        data: {
          title: item.payload.title,
          body: item.payload.body,
          ...(item.payload.imageUrl && { imageUrl: item.payload.imageUrl }),
          ...(item.data && { ...item.data }),
        },
        ...(item.apns && {
          apns: {
            payload: {
              aps: {
                'mutable-content': item.apns.mutableContent,
                'content-available': item.apns.contentAvailable,
                badge: item.apns.badge,
              },
            },
          },
        }),
      })),
    );

    return sendResult.responses.map((response, index) => ({
      success: response.success,
      errorMessage: response.error?.message,
      errorCode: response.error?.code,
      token: messages[index].recipient,
      id: messages[index].id,
    }));
  }

  /**
   * Send a push notification to a recipient.
   * @param message - The message to send.
   * @returns The response from the FCM API.
   */
  async send(message: IPushMessage): Promise<any> {
    return this.sendEach([message]);
  }
}
