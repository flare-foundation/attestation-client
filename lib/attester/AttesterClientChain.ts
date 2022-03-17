export class AttesterClientChain {
  public name!: string;
  public url!: string;

  public username!: string;
  public password!: string;

  public metaData!: any;

  public maxRequestsPerSecond: number = 2;
  public maxProcessingTransactions: number = 10;

  public clientTimeout: number = 3000;
  public clientRetries: number = 3;

  public maxFailedRetry: number = 1;
  public delayBeforeRetry: number = 10;

  public reverificationTimeOffset: number = 5;
}
