# NestJS Kafka

A structured Kafka integration for NestJS inspired by BullMQ, offering decorators, modular configuration, and a scalable consumer/producer architecture.

## Installation

```bash
npm install kafka-nestjs
```

## Features

- 🎯 Decorator-based Kafka consumer configuration
- 🔄 Dynamic listener service for automatic consumer registration
- 📤 Producer service for sending messages
- ⚙️ Flexible configuration options (sync and async)
- 🔌 Global module support
- 🏗️ Built on top of KafkaJS

## Quick Start

### 1. Import the Module

```typescript
import { KafkaModule } from 'kafka-nestjs';

@Module({
  imports: [
    KafkaModule.forRoot({
      clientId: 'my-app',
      brokers: ['localhost:9092'],
    }),
  ],
})
export class AppModule {}
```

### 2. Create a Consumer

```typescript
import { KafkaConsumer } from 'kafka-nestjs';

@Controller()
export class MyController {
  @KafkaConsumer({
    subscribe: {
      topics: ['example.event.stage'],
      fromBeginning: true
    },
    consumerConfig: {
      groupId: 'example.group.id'
    }  
  })
  async handleMessage(message: any) {
    console.log('Received message:', message);
  }


  @KafkaConsumer({
    subscribe: {
      topics: ['example.event.stage'],
      fromBeginning: true
    },
    consumerConfig: {
      groupId: 'example.group.id'
    }  
  })
  async handleMessageWithPayload(message: any, payload: EachMessagePayload) {
    console.log('Received message:', message);
  }
}
```

### 3. Send Messages

```typescript
import { KafkaProducerService } from 'kafka-nestjs';

@Controller()
export class MyController {
  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  @Post('send')
  async sendMessage() {
    await this.kafkaProducer.send({
      topic: 'my-topic',
      messages: [{ value: 'Hello Kafka!' }],
    });
  }
}
```

## Configuration Options

### Synchronous Configuration

```typescript
KafkaModule.forRoot({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
  // ... other KafkaJS options
})
```

### Asynchronous Configuration

```typescript
KafkaModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    clientId: configService.get('KAFKA_CLIENT_ID'),
    brokers: configService.get('KAFKA_BROKERS'),
  }),
  inject: [ConfigService],
})
```

### Producer-Only Mode

If you only need to produce messages:

```typescript
import { KafkaModule } from 'kafka-nestjs';
import { Module } from '@nestjs/common';
import { ExampleService } from '.example.service';

@Module({
  imports: [
    KafkaModule.forProducer()
  ],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
```

```typescript
import { KafkaProducerService } from 'kafka-nestjs';

export class ExampleService {
  constructor(
    private readonly kafkaProducerService: KafkaProducerService,
  }{}
}
```

## Dependencies

- @nestjs/common: ^11.1.2
- @nestjs/core: ^11.1.2
- kafkajs: ^2.2.4

## License

MIT

## Author

Behrad Kazemi

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
