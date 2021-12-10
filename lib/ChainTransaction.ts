import { ChainNode } from "./ChainNode";
import { DataTransaction } from "./DataTransaction";

export enum ChainTransactionStatus {
  queued,
  processing,
  failed,
  valid,
  invalid,
}

export interface EventProcessed {
  (tx: ChainTransaction): void;
}

export class ChainTransaction {
  epochId!: number;

  transactionHash!: string;
  metaData!: any;

  status: ChainTransactionStatus = ChainTransactionStatus.invalid;

  startTime: number = 0;
  endTime: number = 0;

  chainNode: ChainNode | undefined;

  dataTransaction!: DataTransaction;

  onProcessed: EventProcessed | undefined = undefined;
}
