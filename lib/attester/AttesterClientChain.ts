export class AttesterClientChain {
  public name!: string;
  public url!: string;

  public username!: string;
  public password!: string;

  public metaData!: string;

  public maxRequestsPerSecond: number = 2;
  public maxProcessingTransactions: number = 10;

  public maxFailedRetry: number = 1;
  public delayBeforeRetry: number = 10;
}
