import { NotiCoreDeliveryChannelEnum } from '../enums';
import { INotiCoreNotificationData, INotiCoreNotificationPayload } from './notification-entity.interface';

export interface INotificationMessage {
  type: NotiCoreDeliveryChannelEnum;
  additionalData?: Record<string, string>;
  recipient: string;
  payload: INotiCoreNotificationPayload;
}

export interface ISMSMessage extends INotificationMessage {
  type: NotiCoreDeliveryChannelEnum.SMS;
  payload: {
    body: string;
  };
}

export interface IPushMessage extends INotificationMessage {
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

export interface IEmailMessage extends INotificationMessage {
  type: NotiCoreDeliveryChannelEnum.EMAIL;
  id: string;
  payload: {
    title: string;
    body: string;
  };
}

export type INotificationMessagePayload = ISMSMessage | IPushMessage | IEmailMessage;

export interface IMessageSender<T extends INotificationMessagePayload> {
  send(message: T): Promise<any>;
  sendEach(messages: T[]): Promise<any>;
}

export interface IFCMSender extends IMessageSender<IPushMessage> {
  sendEach(messages: IPushMessage[]): Promise<
    {
      success: boolean;
      errorMessage?: string;
      errorCode?: string;
      id: string;
      token: string;
    }[]
  >;
  send(message: IPushMessage): Promise<{
    success: boolean;
    errorMessage?: string;
    errorCode?: string;
    id: string;
    token: string;
  }>;
}

export interface ISMSSender extends IMessageSender<ISMSMessage> {
  send(message: ISMSMessage): Promise<any>;
  sendEach(messages: ISMSMessage[]): Promise<any>;
}

export interface IEmailSender extends IMessageSender<IEmailMessage> {
  send(message: IEmailMessage): Promise<{
    success: boolean;
    data: {
      id?: string;
      message?: string;
      status: number;
      details?: string;
    };
  }>;
  sendEach(messages: IEmailMessage[]): Promise<
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
