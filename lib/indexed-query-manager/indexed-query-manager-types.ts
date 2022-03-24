import { ChainType } from "flare-mcc";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { DatabaseService } from "../utils/databaseService";

export interface IndexedQueryManagerOptions {
  chainType: ChainType;
  dbService?: DatabaseService;
  numberOfConfirmations: ()=> number;
  maxValidIndexerDelaySec: number;
  // return windows start time from current epochId
  windowStartTime: (roundId: number) => number;
}

export interface BlockHeightSample {
  height: number;
  timestamp: number;
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

export interface ConfirmedBlockQueryRequest {
  blockNumber: number;
  roundId: number;
  numberOfConfirmations: number;
  dataAvailabilityProof: string; // hash of confirmation block(used for syncing of edge - cases)
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface ConfirmedBlockQueryResponse {
  status: "OK" | "RECHECK" | "NOT_EXIST" | "SYSTEM_FAILURE";
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
  status: "OK" | "RECHECK" | "NOT_EXIST" | "SYSTEM_FAILURE";
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
  status: "OK" | "RECHECK" | "NO_OVERFLOW_BLOCK" | "SYSTEM_FAILURE";
  transactions?: DBTransactionBase[];
  block?: DBBlockBase;
}