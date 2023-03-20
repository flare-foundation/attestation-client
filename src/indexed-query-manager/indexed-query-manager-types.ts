import { ChainType } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";

export interface IndexedQueryManagerOptions {
  chainType: ChainType;
  entityManager: EntityManager;
  numberOfConfirmations: () => number;
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

export interface ConfirmedBlockQueryRequest {
  blockNumber: number;
}

export type ConfirmedBlockQueryStatusType = "OK" | "NOT_EXIST";
export interface ConfirmedBlockQueryResponse {
  status: ConfirmedBlockQueryStatusType;
  block?: DBBlockBase;
}
export interface ConfirmedTransactionQueryRequest {
  txId: string; // transaction id
}

export type ConfirmedTransactionQueryStatusType = "OK" | "NOT_EXIST";
export interface ConfirmedTransactionQueryResponse {
  status: ConfirmedTransactionQueryStatusType;
  transaction?: DBTransactionBase;
}

export interface ReferencedTransactionsQueryRequest {
  minimalBlockNumber: number;
  deadlineBlockNumber: number;
  deadlineBlockTimestamp: number;
  paymentReference: string; // payment reference
}

export type ReferencedTransactionsQueryStatusType = "OK" | "NO_OVERFLOW_BLOCK" | "DATA_AVAILABILITY_FAILURE";
export interface ReferencedTransactionsQueryResponse {
  status: ReferencedTransactionsQueryStatusType;
  transactions?: DBTransactionBase[];
  firstOverflowBlock?: DBBlockBase;
  minimalBlock?: DBBlockBase;
}
