import { ChainNode } from "./ChainNode";

export enum ChainTransactionStatus {
  queued,
  processing,
  failed,
  valid,
  invalid,
}

export class ChainTransaction {
  epoch!: number;
  id!: number;

  transactionHash!: string;
  metaData!: any;

  status: ChainTransactionStatus = ChainTransactionStatus.invalid;

  startTime: number = 0;
  endTime: number = 0;

  chainNode: ChainNode | undefined;
}
