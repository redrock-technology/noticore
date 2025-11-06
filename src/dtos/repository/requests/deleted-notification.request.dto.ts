export class NotiCoreDeleteNotificationForUserDeletedPartitionRequestDto {
  userId: string;
  lastId?: string;
  traceId: string;
  where?: any;
  limit?: number;
}

export class NotiCoreBulkDeleteNotificationUserDeletedPartitionRequestDto {
  batchMessages: NotiCoreDeleteNotificationForUserDeletedPartitionRequestDto[];
}

export class NotiCoreReferenceDeletedNotificationRequestDto {
  referenceId: string;
  partitionSize: number;
  where?: any;
  select?: string[];
}

export class NotiCoreUserDeletedNotificationRequestDto {
  userId: string;
  partitionSize: number;
}
