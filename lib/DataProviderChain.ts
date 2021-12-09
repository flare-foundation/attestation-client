export class DataProviderChain {
    public name!: string;
    public url!: string;

    public username!: string;
    public password!: string;

    public metaData!: string;

    public maxRequestsPerSecond: number = 2;
    public maxProcessingTransactions: number = 10;
}
