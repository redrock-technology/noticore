export type Lock = any;
export type LockHandle = any;

export interface INotiCoreResourceLock {
  acquireLock({ key, ttl }: { key: string; ttl: number }): Promise<{ lock: Lock; handle: LockHandle }>;
  releaseLock({ lock, handle }: { lock: Lock; handle: LockHandle }): Promise<void>;
}
