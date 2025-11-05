import { Injectable } from '@nestjs/common';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/Interfaces/MailgunClient/IMailgunClient';
import { IEmailMessage, IEmailSender, IMessageSender, MailgunConfigType } from '../../interfaces';

@Injectable()
export class MailgunEdgeService implements IMessageSender<IEmailMessage>, IEmailSender {
  private mailgun: Mailgun;
  private client: IMailgunClient;
  constructor(private readonly config: MailgunConfigType) {
    this.config = config;
    this.mailgun = new Mailgun(FormData);
    this.client = this.mailgun.client({ username: 'api', key: this.config.key });
  }

  private async sendMessage(
    subject: string,
    html: string,
    to: string | string[],
  ): Promise<{
    success: boolean;
    data: {
      id?: string;
      message?: string;
      status: number;
      details?: string;
    };
  }> {
    const data = await this.client.messages.create(this.config.domain, {
      from: this.config.from,
      to,
      subject,
      html,
    });
    return {
      success: data.status === 200,
      data,
    };
  }

  async send(message: IEmailMessage): Promise<{
    success: boolean;
    data: {
      id?: string;
      message?: string;
      status: number;
      details?: string;
    };
  }> {
    return await this.sendMessage(message.payload.title, message.payload.body, message.recipient);
  }

  async sendEach(messages: IEmailMessage[]): Promise<
    {
      success: boolean;
      data: {
        id?: string;
        message?: string;
        status: number;
        details?: string;
      };
    }[]
  > {
    return Promise.all(messages.map((message) => this.send(message)));
  }

  async sendBulk(
    subject: string,
    html: string,
    to: string[],
  ): Promise<{
    success: boolean;
    data: {
      id?: string;
      message?: string;
      status: number;
      details?: string;
    };
  }> {
    return await this.sendMessage(subject, html, to);
  }
}
