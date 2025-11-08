# NotiCore Notification Service Implementation Guide

A comprehensive step-by-step guide to implement a multi-channel notification service using NotiCore in a NestJS application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Database Entities](#database-entities)
7. [Event Publisher](#event-publisher)
8. [Services Setup](#services-setup)
9. [Module Configuration](#module-configuration)
10. [Usage Examples](#usage-examples)
11. [Testing](#testing)
12. [Best Practices](#best-practices)

---

## Overview

**NotiCore** is a powerful notification management library that provides:

- **Multi-channel support**: SMS, Email, and Push notifications
- **Automatic retry mechanism**: Failed notifications are retried with exponential backoff
- **Status tracking**: Track notification lifecycle (created, pending, sent, failed)
- **Queue-based processing**: Async notification delivery using message queues
- **Repository pattern**: Works with TypeORM, Prisma, or custom repositories
- **Extensible**: Easy to add custom channels and templates

### Key Components

- **NotificationService**: Manages notification records
- **NotificationDeliveryService**: Handles actual message delivery
- **EventPublisher**: Publishes events to message queue (Kafka/RabbitMQ)
- **Message Senders**: FCM (Push), SMS.to (SMS), Mailgun (Email)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NotificationService                           │
│  - Creates notification records                                  │
│  - Manages notification lifecycle                                │
│  - Publishes events to queue                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Message Queue │
                    │  (Kafka/etc)   │
                    └───────┬───────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              NotificationDeliveryService                         │
│  - Consumes queue events                                         │
│  - Prepares notification templates                               │
│  - Delivers via channels (SMS/Email/Push)                        │
│  - Handles retries and failures                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐        ┌─────────┐
   │   FCM   │         │ SMS.to  │        │Mailgun  │
   │ (Push)  │         │  (SMS)  │        │ (Email) │
   └─────────┘         └─────────┘        └─────────┘
```

---

## Prerequisites

Before starting, ensure you have:

- **NestJS application** (v10+)
- **TypeORM** configured with PostgreSQL
- **Message Queue** (Kafka recommended, but RabbitMQ/Redis works too)
- **Firebase Admin SDK** credentials (for push notifications)
- **SMS.to account** (for SMS)
- **Mailgun account** (for emails)

---

## Installation

### 1. Install NotiCore

```bash
npm install noticore
```

### 2. Install Required Dependencies

```bash
npm install firebase-admin
npm install @nestjs/typeorm typeorm pg
npm install kafka-nestjs  # or your message queue library
```

---

## Configuration

### 1. Create Communication Config

Create `src/config/communication.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { 
  NotiCoreFCMConfigType, 
  NotiCoreMailgunConfigType, 
  NotiCoreSmsToConfigType 
} from 'noticore';
import { IsNotEmpty, IsString } from 'class-validator';

export const CommunicationConfigToken = 'COMMUNICATION';

export type CommunicationConfig = {
  smsToConfig: NotiCoreSmsToConfigType;
  fcmConfig: NotiCoreFCMConfigType;
  emailConfig: NotiCoreMailgunConfigType;
};

class CommunicationEnvSchema {
  @IsString()
  @IsNotEmpty()
  MAILGUN_DOMAIN!: string;

  @IsString()
  @IsNotEmpty()
  MAILGUN_FROM!: string;

  @IsString()
  @IsNotEmpty()
  MAILGUN_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  SMSTO_URL!: string;

  @IsString()
  @IsNotEmpty()
  SMSTO_PROVIDER_TOKEN!: string;

  @IsString()
  @IsNotEmpty()
  SMSTO_NUMBER!: string;
}

export function getCommunicationConfig(): CommunicationConfig {
  const ENV = process.env;
  
  return {
    smsToConfig: {
      providerToken: ENV.SMSTO_PROVIDER_TOKEN!,
      url: ENV.SMSTO_URL!,
      number: ENV.SMSTO_NUMBER!,
    },
    fcmConfig: {
      serviceAccount: require('../../firebase-service-key.json') as admin.ServiceAccount,
    },
    emailConfig: {
      domain: ENV.MAILGUN_DOMAIN!,
      from: ENV.MAILGUN_FROM!,
      key: ENV.MAILGUN_API_KEY!,
      ssl: false,
      logging: false,
    },
  };
}

export const communicationConfig = registerAs(
  CommunicationConfigToken, 
  (): CommunicationConfig => getCommunicationConfig()
);
```

### 2. Initialize NotiCore in Bootstrap

In your `src/main.ts`:

```typescript
import { NotiCoreNotificationConfigService } from 'noticore';
import { getCommunicationConfig } from './config/communication.config';

async function bootstrap(): Promise<void> {
  // Initialize NotiCore configurations BEFORE creating the app
  const communicationConfig = getCommunicationConfig();
  
  NotiCoreNotificationConfigService.initializeFCMConfig(
    communicationConfig.fcmConfig
  );
  NotiCoreNotificationConfigService.initializeSmsToConfig(
    communicationConfig.smsToConfig
  );
  NotiCoreNotificationConfigService.initializeEmailConfig(
    communicationConfig.emailConfig
  );

  const app = await NestFactory.create(AppModule);
  
  // ... rest of your bootstrap code
}
```

### 3. Environment Variables

Add to your `.env` file:

```env
# Firebase Push Notifications
# (Service account JSON file path configured in code)

# SMS Configuration
SMSTO_URL=https://api.sms.to
SMSTO_PROVIDER_TOKEN=your_smsto_token
SMSTO_NUMBER=+1234567890

# Email Configuration
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM=noreply@yourdomain.com
MAILGUN_API_KEY=key-xxxxxxxxxxxxx
```

---

## Database Entities

### 1. Notification Entity

Create `src/notification/entities/notification.entity.ts`:

```typescript
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { 
  INotiCoreNotificationEntity, 
  NotiCoreNotificationStatusEnum 
} from 'noticore';

@Entity({ name: 'notification' })
@Index('idx_notification_user_id', ['userId'])
@Index('idx_notification_status', ['status'])
@Index('idx_notification_retry_count', ['retryCount'])
export class NotificationEntity 
  extends BaseEntity 
  implements INotiCoreNotificationEntity 
{
  @Column({ type: 'enum', enum: NotificationTypeEnum })
  type: NotificationTypeEnum;

  @Column({ type: 'uuid' })
  referenceId: string;

  @Column({ type: 'enum', enum: NotificationReferenceTypeEnum })
  referenceType: NotificationReferenceTypeEnum;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotiCoreNotificationStatusEnum,
    default: NotiCoreNotificationStatusEnum.CREATED,
  })
  status: NotiCoreNotificationStatusEnum;

  @Column({ type: 'varchar', default: null })
  errorMessage: string | null;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', default: null })
  retryAt: Date | null;

  @Column({ type: 'timestamp', default: null })
  seenAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expireAt: Date | null;
}
```

### 2. Notification Delivery Entity

Create `src/notification/entities/notification-delivery.entity.ts`:

```typescript
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import {
  INotiCoreDeliveryEntity,
  INotiCoreNotificationData,
  INotiCoreNotificationPayload,
  NotiCoreDeliveryChannelEnum,
  NotiCoreNotificationStatusEnum,
} from 'noticore';

export class NotificationPayload implements INotiCoreNotificationPayload {
  body: string;
  title: string;
  imageUrl?: string;
  avatarUrl?: string;
}

export class NotificationData implements INotiCoreNotificationData {
  type: string;
  referenceId: string;
  referenceType: string;
}

@Entity({ name: 'notification_delivery' })
@Index('idx_notification_delivery_channelType', ['channelType'])
@Index('idx_notification_delivery_user_id', ['userId'])
@Index('idx_notification_delivery_status', ['status'])
export class NotificationDeliveryEntity 
  extends BaseEntity 
  implements INotiCoreDeliveryEntity 
{
  @Column({ type: 'jsonb', nullable: false })
  payload: NotificationPayload;

  @Column({ type: 'jsonb', nullable: false })
  data: NotificationData;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotiCoreDeliveryChannelEnum,
    nullable: false,
  })
  channelType: NotiCoreDeliveryChannelEnum;

  @Column({
    type: 'enum',
    enum: NotiCoreNotificationStatusEnum,
    default: NotiCoreNotificationStatusEnum.CREATED,
  })
  status: NotiCoreNotificationStatusEnum;

  @Column({ type: 'varchar', nullable: false })
  recipient: string;

  @Column({ type: 'varchar', default: null })
  errorMessage: string | null;

  @Column({ default: 0 })
  retryCount: number;
}
```

---

## Event Publisher

Create `src/notification/queues/notification.event-publisher.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from 'kafka-nestjs';
import { 
  INotiCoreDeliveryMQEventPublisher, 
  INotiCoreNotificationMQEventPublisher 
} from 'noticore';

@Injectable()
export class NotificationEventPublisher
  implements 
    INotiCoreNotificationMQEventPublisher, 
    INotiCoreDeliveryMQEventPublisher
{
  constructor(
    private readonly kafkaProducerService: KafkaProducerService
  ) {}

  async publishNotificationCreated(dto: any[]): Promise<void> {
    await this.kafkaProducerService.send({
      topic: 'notification.created',
      messages: dto.map((message) => ({
        value: JSON.stringify(message),
      })),
    });
  }

  async publishNotificationScheduled(dto: any[]): Promise<void> {
    await this.kafkaProducerService.send({
      topic: 'notification.scheduled',
      messages: dto.map((message) => ({
        value: JSON.stringify(message),
      })),
    });
  }
}
```

---

## Services Setup

### 1. Notification Service

Create `src/notification/services/notification.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotiCoreNotificationRepositoryFactory,
  NotiCoreNotificationService,
  NotiCoreServiceFactory,
  RepositoryOptionEnum,
} from 'noticore';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationEventPublisher } from '../queues/notification.event-publisher';

@Injectable()
export class NotificationService {
  readonly ncClient: NotiCoreNotificationService<NotificationEntity>;

  constructor(
    private readonly notificationEventPublisher: NotificationEventPublisher,
    
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
  ) {
    // Initialize NotiCore Notification Service
    this.ncClient = NotiCoreServiceFactory.createNotificationService({
      eventPublisher: this.notificationEventPublisher,
      repository: NotiCoreNotificationRepositoryFactory.createNotificationRepository(
        RepositoryOptionEnum.TYPEORM,
        this.notificationRepository,
      ),
    });
  }

  // Example: Create notifications
  async createNotifications(dto: {
    userIds: string[];
    type: string;
    referenceId: string;
    referenceType: string;
  }): Promise<void> {
    await this.ncClient.bulkInsert({
      data: dto.userIds.map(userId => ({
        userId,
        type: dto.type,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        status: NotiCoreNotificationStatusEnum.CREATED,
        retryCount: 0,
      })),
    });
  }
}
```

### 2. Notification Delivery Service

Create `src/notification/services/notification-delivery.service.ts`:

```typescript
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotiCoreDeliveryService,
  NotiCoreMessageSenderFactory,
  NotiCoreNotificationRepositoryFactory,
  NotiCoreServiceFactory,
  NotiCoreDeliveryChannelEnum,
  RepositoryOptionEnum,
} from 'noticore';
import { NotificationDeliveryEntity } from '../entities/notification-delivery.entity';
import { NotificationEventPublisher } from '../queues/notification.event-publisher';

@Injectable()
export class NotificationDeliveryService {
  private readonly ncDelivery: NotiCoreDeliveryService<NotificationDeliveryEntity>;

  constructor(
    private readonly eventPublisher: NotificationEventPublisher,
    
    @InjectRepository(NotificationDeliveryEntity)
    private notificationDeliveryRepository: Repository<NotificationDeliveryEntity>,
  ) {
    // Create message senders for each channel
    const smsSender = NotiCoreMessageSenderFactory.createSender(
      NotiCoreDeliveryChannelEnum.SMS
    );
    const fcmSender = NotiCoreMessageSenderFactory.createSender(
      NotiCoreDeliveryChannelEnum.PUSH
    );
    const emailSender = NotiCoreMessageSenderFactory.createSender(
      NotiCoreDeliveryChannelEnum.EMAIL
    );

    // Initialize NotiCore Delivery Service
    this.ncDelivery = NotiCoreServiceFactory.createDeliveryService({
      repository: NotiCoreNotificationRepositoryFactory.createNotificationDeliveryRepository(
        RepositoryOptionEnum.TYPEORM,
        this.notificationDeliveryRepository,
      ),
      eventPublisher: this.eventPublisher,
      smsSender,
      fcmSender,
      emailSender,
    });
  }

  // Example: Handle notification created event
  async handleNotificationCreated(dto: {
    userId: string;
    channelType: NotiCoreDeliveryChannelEnum;
    payload: { title: string; body: string };
    data: any;
    recipients: Set<string>;
  }): Promise<void> {
    await this.ncDelivery.handleNotificationCreated({
      channelType: dto.channelType,
      userId: dto.userId,
      payload: dto.payload,
      priority: NotiCorePriorityEnum.HIGH,
      data: dto.data,
      recipients: dto.recipients,
      handleInvalidFCMTokens: async (invalidTokens: string[]) => {
        // Clean up invalid FCM tokens
        console.log('Invalid tokens:', invalidTokens);
      },
    });
  }
}
```

---

## Module Configuration

Create `src/notification/notification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationService } from './services/notification.service';
import { NotificationDeliveryEntity } from './entities/notification-delivery.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationEventPublisher } from './queues/notification.event-publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationDeliveryEntity, 
      NotificationEntity
    ]),
  ],
  providers: [
    NotificationDeliveryService,
    NotificationService,
    NotificationEventPublisher,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
```

Add the module to your `AppModule`:

```typescript
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    // ... other modules
    NotificationModule,
  ],
})
export class AppModule {}
```

---

## Usage Examples

### Example 1: Send Push Notification

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotiCoreDeliveryChannelEnum } from 'noticore';

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  async sendAnnouncement(userId: string, fcmToken: string): Promise<void> {
    await this.notificationDeliveryService.handleNotificationCreated({
      userId,
      channelType: NotiCoreDeliveryChannelEnum.PUSH,
      payload: {
        title: 'New Announcement',
        body: 'Check out our latest updates!',
      },
      data: {
        type: 'announcement',
        referenceId: '123e4567-e89b-12d3-a456-426614174000',
        referenceType: 'announcement',
      },
      recipients: new Set([fcmToken]),
    });
  }
}
```

### Example 2: Send Email Notification

```typescript
async sendEmailNotification(userId: string, email: string): Promise<void> {
  await this.notificationDeliveryService.handleNotificationCreated({
    userId,
    channelType: NotiCoreDeliveryChannelEnum.EMAIL,
    payload: {
      title: 'Welcome to Our Platform',
      body: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
    },
    data: {
      type: 'welcome',
      referenceId: userId,
      referenceType: 'user',
    },
    recipients: new Set([email]),
  });
}
```

### Example 3: Send SMS Notification

```typescript
async sendSMSNotification(userId: string, phoneNumber: string): Promise<void> {
  await this.notificationDeliveryService.handleNotificationCreated({
    userId,
    channelType: NotiCoreDeliveryChannelEnum.SMS,
    payload: {
      title: 'Verification Code',
      body: 'Your verification code is: 123456',
    },
    data: {
      type: 'verification',
      referenceId: userId,
      referenceType: 'user',
    },
    recipients: new Set([phoneNumber]),
  });
}
```

### Example 4: Multi-Channel Notification

```typescript
async sendMultiChannelNotification(
  userId: string,
  email: string,
  phoneNumber: string,
  fcmToken: string,
): Promise<void> {
  const channels = [
    {
      channelType: NotiCoreDeliveryChannelEnum.EMAIL,
      recipients: new Set([email]),
    },
    {
      channelType: NotiCoreDeliveryChannelEnum.SMS,
      recipients: new Set([phoneNumber]),
    },
    {
      channelType: NotiCoreDeliveryChannelEnum.PUSH,
      recipients: new Set([fcmToken]),
    },
  ];

  const promises = channels.map((channel) =>
    this.notificationDeliveryService.handleNotificationCreated({
      userId,
      channelType: channel.channelType,
      payload: {
        title: 'Important Update',
        body: 'Please check your account for important updates.',
      },
      data: {
        type: 'update',
        referenceId: userId,
        referenceType: 'user',
      },
      recipients: channel.recipients,
    }),
  );

  await Promise.all(promises);
}
```

---

## Testing

### Mock Setup

Create `test/shared/helpers/notification/mocks.ts`:

```typescript
import {
  INotiCoreEmailMessage,
  INotiCorePushMessage,
  MailgunEdgeService,
  SmsToEdgeService,
  FCMEdgeService,
} from 'noticore';

export function mockSMSService() {
  const sendEach = jest
    .spyOn(SmsToEdgeService.prototype, 'sendEach')
    .mockImplementation(async () => {
      return Promise.resolve({ success: true });
    });

  const send = jest
    .spyOn(SmsToEdgeService.prototype, 'send')
    .mockImplementation(async () => {
      return Promise.resolve({ success: true });
    });

  return { sendEach, send };
}

export function mockFCMEdgeService() {
  const sendEach = jest
    .spyOn(FCMEdgeService.prototype, 'sendEach')
    .mockImplementation((messages: INotiCorePushMessage[]) => {
      return Promise.resolve(
        messages.map((message) => ({
          success: true,
          id: message.id,
          token: message.recipient,
        })),
      );
    });

  const send = jest
    .spyOn(FCMEdgeService.prototype, 'send')
    .mockImplementation((message: INotiCorePushMessage) => {
      return Promise.resolve({
        success: true,
        id: message.id,
        token: message.recipient,
      });
    });

  return { sendEach, send };
}

export function mockEmailEdgeService() {
  const sendEach = jest
    .spyOn(MailgunEdgeService.prototype, 'sendEach')
    .mockImplementation((messages: INotiCoreEmailMessage[]) => {
      return Promise.resolve(
        messages.map((message) => ({
          success: true,
          data: {
            id: message.id,
            message: message.payload.body,
            status: 200,
          },
        })),
      );
    });

  const send = jest
    .spyOn(MailgunEdgeService.prototype, 'send')
    .mockImplementation((message: INotiCoreEmailMessage) => {
      return Promise.resolve({
        success: true,
        data: {
          id: message.id,
          message: message.payload.body,
          status: 200,
        },
      });
    });

  return { sendEach, send };
}
```

### Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from './notification-delivery.service';
import { mockFCMEdgeService } from '../../test/shared/helpers/notification/mocks';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let fcmMock: ReturnType<typeof mockFCMEdgeService>;

  beforeEach(async () => {
    fcmMock = mockFCMEdgeService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationDeliveryService],
    }).compile();

    service = module.get<NotificationDeliveryService>(
      NotificationDeliveryService,
    );
  });

  it('should send push notification', async () => {
    await service.handleNotificationCreated({
      userId: 'user-123',
      channelType: NotiCoreDeliveryChannelEnum.PUSH,
      payload: {
        title: 'Test',
        body: 'Test notification',
      },
      data: { type: 'test' },
      recipients: new Set(['token-123']),
    });

    expect(fcmMock.send).toHaveBeenCalled();
  });
});
```

---

## Best Practices

### 1. **Always Initialize Config Before App Creation**

```typescript
// ✅ Good
async function bootstrap() {
  const config = getCommunicationConfig();
  NotiCoreNotificationConfigService.initializeFCMConfig(config.fcmConfig);
  
  const app = await NestFactory.create(AppModule);
  // ...
}

// ❌ Bad - Config initialized after app creation
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = getCommunicationConfig();
  NotiCoreNotificationConfigService.initializeFCMConfig(config.fcmConfig);
}
```

### 2. **Use Template Factories for Dynamic Content**

Create reusable template factories:

```typescript
export function notificationTemplateFactory({
  referenceType,
  channelType,
  data,
}: {
  referenceType: string;
  channelType: NotiCoreDeliveryChannelEnum;
  data: any;
}): string {
  switch (referenceType) {
    case 'announcement':
      return channelType === NotiCoreDeliveryChannelEnum.EMAIL
        ? `<html><body>${data.template}</body></html>`
        : data.template;
    default:
      return data.template;
  }
}
```

### 3. **Handle Invalid FCM Tokens**

Always provide a callback to clean up invalid tokens:

```typescript
await this.ncDelivery.handleNotificationCreated({
  // ... other params
  handleInvalidFCMTokens: async (invalidTokens: string[]) => {
    // Remove invalid tokens from your database
    await this.sessionService.removeFcmTokens(invalidTokens);
  },
});
```

### 4. **Use Database Indexes**

Add proper indexes to your entities for better performance:

```typescript
@Index('idx_notification_user_id_status', ['userId', 'status'])
@Index('idx_notification_retry_at', ['retryAt'])
```

### 5. **Implement Retry Logic**

NotiCore handles retries automatically, but you can customize:

```typescript
// In your cron service
@Cron('*/5 * * * *') // Every 5 minutes
async retryFailedNotifications() {
  await this.notificationDeliveryService.deliverPendingNotifications({
    limit: 100,
    maxRetries: 3,
  });
}
```

### 6. **Use Enums for Type Safety**

```typescript
export enum NotificationTypeEnum {
  ANNOUNCEMENT = 'announcement',
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
}

export enum NotificationReferenceTypeEnum {
  ANNOUNCEMENT = 'announcement',
  USER = 'user',
}
```

### 7. **Monitor Notification Status**

Query notification status for debugging:

```typescript
async getNotificationStatus(notificationId: string) {
  return await this.notificationRepository.findOne({
    where: { id: notificationId },
    select: ['id', 'status', 'errorMessage', 'retryCount'],
  });
}
```

### 8. **Graceful Error Handling**

Wrap notification calls in try-catch:

```typescript
try {
  await this.notificationDeliveryService.handleNotificationCreated({
    // ... params
  });
} catch (error) {
  this.logger.error('Failed to send notification', error);
  // Don't throw - let the retry mechanism handle it
}
```

---

## Common Issues & Solutions

### Issue 1: FCM Not Sending

**Problem**: Push notifications not being delivered.

**Solution**: 
- Verify Firebase service account JSON is correct
- Check FCM token is valid
- Ensure firebase-admin is properly initialized

### Issue 2: Email/SMS Not Sending

**Problem**: Email or SMS not being delivered.

**Solution**:
- Verify API credentials in environment variables
- Check sender/from address is verified in provider dashboard
- Review provider account limits

### Issue 3: Notifications Stuck in CREATED Status

**Problem**: Notifications not progressing to SENT status.

**Solution**:
- Ensure event publisher is properly connected to message queue
- Check queue consumer is running
- Verify cron jobs are executing

---

## Resources

- **NotiCore Package**: [npm package](https://www.npmjs.com/package/noticore)
- **Firebase Admin SDK**: [Documentation](https://firebase.google.com/docs/admin/setup)
- **Mailgun API**: [Documentation](https://documentation.mailgun.com/en/latest/)
- **SMS.to API**: [Documentation](https://sms.to/docs)

---

## Summary

You've now learned how to:

✅ Install and configure NotiCore  
✅ Set up database entities for notifications  
✅ Create notification and delivery services  
✅ Implement event publishers  
✅ Send multi-channel notifications (SMS, Email, Push)  
✅ Test notification services  
✅ Follow best practices for production use  

Start sending notifications with confidence! 🚀

---

## Author

**Behrad Kazemi**

- GitHub: [@behrad-kzm](https://github.com/behrad-kzm)

