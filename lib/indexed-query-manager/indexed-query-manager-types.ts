import { ChainType } from "flare-mcc";
import { DBBlockBase } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { DatabaseService } from "../utils/databaseService";

export interface IndexedQueryManagerOptions {
  chainType: ChainType;
  dbService?: DatabaseService;
  // return windows start time from current epochId
  windowStartTime: (epochId: number) => number;
}

////////////////////////////////////////////////////////
/// General query params
////////////////////////////////////////////////////////

export interface TransactionQueryParams {
  roundId: number;
  endBlock: number;
  transactionId?: string;
  paymentReference?: string;
}

export interface BlockQueryParams {
  hash?: string;
  blockNumber?: number;
  roundId: number;
  confirmed?: boolean;
}

export type IndexerQueryType = "FIRST_CHECK" | "RECHECK";

////////////////////////////////////////////////////////
/// Specific query requests and responses
////////////////////////////////////////////////////////

export interface BlockHashQueryRequest {
  hash: string;
  roundId: number;
  type: IndexerQueryType; // FIRST_CHECK` or `RECHECK`
}

export interface BlockHashQueryResponse {
  status: "OK" | "NOT_EXIST";
  block?: DBBlockBase;
}

export interface ConfirmedBlockQueryRequest {
  blockNumber: number;
  roundId: number;
  numberOfConfirmations: number;
  dataAvailabilityProof: string; // hash of confirmation block(used for syncing of edge - cases)
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface ConfirmedBlockQueryResponse {
  status: "OK" | "RECHECK" | "NOT_EXIST";
  block?: DBBlockBase;
}

export interface ConfirmedTransactionQueryRequest {
  txId: string; // transaction id
  blockNumber: number; // block number for the transaction with `txId
  dataAvailabilityProof: string; // hash of confirmation block(used for syncing of edge - cases)
  roundId: number; // voting round id for check
  numberOfConfirmations: number;
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface ConfirmedTransactionQueryResponse {
  status: "OK" | "RECHECK" | "NOT_EXIST";
  transaction?: DBTransactionBase;
}

export interface ReferencedTransactionsQueryRequest {
  numberOfConfirmations: number; 
  paymentReference: string; // payment reference
  // Used to determine overflow block - the first block with blockNumber > endBlock and timestamp > endTime
  overflowBlockNumber: number;
  dataAvailabilityProof: string; // hash of confirmation block of the overflow block
  roundId: number; // voting round id for check
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface ReferencedTransactionsQueryResponse {
  status: "OK" | "RECHECK" | "NO_OVERFLOW_BLOCK";
  transactions?: DBTransactionBase[];
  block?: DBBlockBase;
}