export class IndexerClientChain {
  public name!: string;
  public url!: string;

  public username!: string;
  public password!: string;

  public maxRequestsPerSecond: number = 2;
  public maxProcessingTransactions: number = 10;

  public clientTimeout: number = 3000;
  public clientRetries: number = 3;

  public maxFailedRetry: number = 1;
  
  public confirmationsCollect: number = 5;
  public confirmationsIndex: number = 7;
}

export class IndexerConfiguration {
  public chains: IndexerClientChain[] = [];
}
