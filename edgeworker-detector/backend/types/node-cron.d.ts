declare module 'node-cron' {
  interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
  }

  interface ScheduledTask {
    start(): void;
    stop(): void;
    destroy(): void;
  }

  export function schedule(
    cronExpression: string,
    func: () => void | Promise<void>,
    options?: ScheduleOptions
  ): ScheduledTask;

  export function validate(cronExpression: string): boolean;
}