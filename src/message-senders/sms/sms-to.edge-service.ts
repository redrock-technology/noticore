import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { IMessageSender, ISMSMessage, ISMSSender, SmsToConfigType } from '../../interfaces';
/**
 * This adapter integrates with the sms.to SMS API (https://sms.to/sms-api/)
 */
@Injectable()
export class SmsToEdgeService implements IMessageSender<ISMSMessage>, ISMSSender {
  private httpService: HttpService;

  constructor(private readonly config: SmsToConfigType) {
    this.config = config;
    this.httpService = new HttpService();
  }

  /**
   * Send a SMS message to a recipient.
   * @param message - The message to send.
   * @param to - The recipient's phone number.
   * @returns The response from the SMS API.
   */
  private async sendMessage(message: string, to: string): Promise<{ success: boolean; data: any }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.config.url,
          {
            message,
            to,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.providerToken}`,
              'Content-Type': 'application/json',
            },
            maxRedirects: 20,
          },
        ),
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send a SMS message to a recipient.
   * @param message - The message to send.
   * @returns The response from the SMS API.
   */
  async send(message: ISMSMessage): Promise<any> {
    await this.sendMessage(message.payload.body, message.recipient);
  }

  /**
   * Send a SMS message to multiple recipients.
   * @param messages - The messages to send.
   * @returns The response from the SMS API.
   */
  async sendEach(messages: ISMSMessage[]): Promise<any> {
    return Promise.all(messages.map((message) => this.send(message)));
  }
}
