import { ChainType } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";

export interface IndexedQueryManagerOptions {
  chainType: ChainType;
  entityManager: EntityManager;
  numberOfConfirmations: () => number;
  maxValidIndexerDelaySec: number;
}

export interface BlockHeightSample {
  height: number;
  timestamp: number;
}

////////////////////////////////////////////////////////
/// General query params
////////////////////////////////////////////////////////

export interface TransactionQueryParams {
  startBlockNumber?: number;
  endBlockNumber?: number;
  transactionId?: string;
  paymentReference?: string;
}

export interface BlockQueryParams {
  hash?: string;
  blockNumber?: number;
  confirmed?: boolean;
}

export type IndexerQueryType = "FIRST_CHECK" | "RECHECK";

export interface TransactionQueryResult {
  result: DBTransactionBase[];
  startBlock?: DBBlockBase;
  endBlock?: DBBlockBase;
}

export interface BlockQueryResult {
  result?: DBBlockBase;
}

////////////////////////////////////////////////////////
/// Specific query requests and responses
////////////////////////////////////////////////////////

export type IndexerQueryStatus = "OK" | "DATA_AVAILABILITY_FAILURE" | "NO_BOUNDARY" | "SYSTEM_FAILURE";

export interface ConfirmedBlockQueryRequest {
  blockNumber: number;
}

export interface ConfirmedBlockQueryResponse {
  status: IndexerQueryStatus | "NOT_EXIST";
  block?: DBBlockBase;
}
export interface ConfirmedTransactionQueryRequest {
  txId: string; // transaction id
}

export interface ConfirmedTransactionQueryResponse {
  status: IndexerQueryStatus | "NOT_EXIST";
  transaction?: DBTransactionBase;
}

export interface ReferencedTransactionsQueryRequest {
  minimalBlockNumber: number;
  deadlineBlockNumber: number;
  deadlineBlockTimestamp: number;
  paymentReference: string; // payment reference
}

export interface ReferencedTransactionsQueryResponse {
  status: IndexerQueryStatus | "NO_OVERFLOW_BLOCK";
  transactions?: DBTransactionBase[];
  firstOverflowBlock?: DBBlockBase;
  minimalBlock?: DBBlockBase;
}
