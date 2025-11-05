export class DeleteNotificationForUserDeletedPartitionRequestDto {
  userId: string;
  lastId?: string;
  traceId: string;
  where?: any;
  limit?: number;
}

export class BulkDeleteNotificationUserDeletedPartitionRequestDto {
  batchMessages: DeleteNotificationForUserDeletedPartitionRequestDto[];
}

export class ReferenceDeletedNotificationRequestDto {
  referenceId: string;
  partitionSize: number;
  where?: any;
  select?: string[];
}

export class UserDeletedNotificationRequestDto {
  userId: string;
  partitionSize: number;
}
