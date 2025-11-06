import { NotiCoreDeliveryChannelEnum } from '../enums';
import { INotiCoreNotificationData, INotiCoreNotificationPayload } from './notification-entity.interface';

export interface INotiCoreNotificationMessage {
  type: NotiCoreDeliveryChannelEnum;
  additionalData?: Record<string, string>;
  recipient: string;
  payload: INotiCoreNotificationPayload;
}

export interface INotiCoreSMSMessage extends INotiCoreNotificationMessage {
  type: NotiCoreDeliveryChannelEnum.SMS;
  payload: {
    body: string;
  };
}

export interface INotiCorePushMessage extends INotiCoreNotificationMessage {
  type: NotiCoreDeliveryChannelEnum.PUSH;
  id: string;
  payload: {
    title: string;
    body: string;
    imageUrl?: string;
  };
  data?: INotiCoreNotificationData;
  apns?: {
    mutableContent: number;
    contentAvailable: number;
    badge: number;
  };
}

export interface INotiCoreEmailMessage extends INotiCoreNotificationMessage {
  type: NotiCoreDeliveryChannelEnum.EMAIL;
  id: string;
  payload: {
    title: string;
    body: string;
  };
}

export type INotiCoreNotificationMessagePayload = INotiCoreSMSMessage | INotiCorePushMessage | INotiCoreEmailMessage;

export interface INotiCoreMessageSender<T extends INotiCoreNotificationMessagePayload> {
  send(message: T): Promise<any>;
  sendEach(messages: T[]): Promise<any>;
}

export interface INotiCoreFCMSender extends INotiCoreMessageSender<INotiCorePushMessage> {
  sendEach(messages: INotiCorePushMessage[]): Promise<
    {
      success: boolean;
      errorMessage?: string;
      errorCode?: string;
      id: string;
      token: string;
    }[]
  >;
  send(message: INotiCorePushMessage): Promise<{
    success: boolean;
    errorMessage?: string;
    errorCode?: string;
    id: string;
    token: string;
  }>;
}

export interface INotiCoreSMSSender extends INotiCoreMessageSender<INotiCoreSMSMessage> {
  send(message: INotiCoreSMSMessage): Promise<any>;
  sendEach(messages: INotiCoreSMSMessage[]): Promise<any>;
}

export interface INotiCoreEmailSender extends INotiCoreMessageSender<INotiCoreEmailMessage> {
  send(message: INotiCoreEmailMessage): Promise<{
    success: boolean;
    data: {
      id?: string;
      message?: string;
      status: number;
      details?: string;
    };
  }>;
  sendEach(messages: INotiCoreEmailMessage[]): Promise<
    {
      success: boolean;
      data: {
        id?: string;
        message?: string;
        status: number;
        details?: string;
      };
    }[]
  >;

  // sendBulk(subject: string, html: string, to: string[]): Promise<{
  //   success: boolean;
  //   data: {
  //     id?: string;
  //     message?: string;
  //     status: number;
  //     details?: string;
  //   };
  // }>;
}
