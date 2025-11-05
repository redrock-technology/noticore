export class ReferenceDeletedNotificationServiceRequestDto {
  referenceId: string;
  partitionSize: number;
  where?: any;
  select?: string[];
  mqCustomPayload?: Record<string, any>;
}

export class UserDeletedNotificationServiceRequestDto {
  userId: string;
  partitionSize: number;
}

export class UserDeletedNotificationDeletePartitionServiceRequestDto {
  userId: string;
  lastId?: string;
  traceId: string;
  limit?: number;
}
