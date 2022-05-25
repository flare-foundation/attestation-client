import { ChainType } from "@flarenetwork/mcc";
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
  returnQueryBoundaryBlocks?: boolean;
}

export interface BlockQueryParams {
  hash?: string;
  endBlock?: number;
  blockNumber?: number;
  roundId: number;
  confirmed?: boolean;
  returnQueryBoundaryBlocks?: boolean;
}

export type IndexerQueryType = "FIRST_CHECK" | "RECHECK";

export interface TransactionQueryResult {
  result: DBTransactionBase[];
  lowerQueryWindowBlock?: DBBlockBase;
  upperQueryWindowBlock?: DBBlockBase;
}

export interface BlockQueryResult {
  result?: DBBlockBase;
  lowerQueryWindowBlock?: DBBlockBase;
  upperQueryWindowBlock?: DBBlockBase;
}

////////////////////////////////////////////////////////
/// Specific query requests and responses
////////////////////////////////////////////////////////

export type UpperBoundaryCheckStatus = "OK" | "RECHECK" | "NO_BOUNDARY" | "SYSTEM_FAILURE";

export interface UpperBoundaryCheck {
  status: UpperBoundaryCheckStatus;
  U?: number;
}

export interface ConfirmedBlockQueryRequest {
  blockNumber?: number;
  roundId: number;
  numberOfConfirmations: number;
  upperBoundProof: string; // hash of confirmation block(used for syncing of edge - cases)
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
  returnQueryBoundaryBlocks?: boolean;
}

export interface ConfirmedBlockQueryResponse {
  status: UpperBoundaryCheckStatus | "NOT_EXIST";
  block?: DBBlockBase;  
  lowerBoundaryBlock?: DBBlockBase;
  upperBoundaryBlock?: DBBlockBase;
}
export interface ConfirmedTransactionQueryRequest {
  txId: string; // transaction id
  // blockNumber: number; // block number for the transaction with `txId
  upperBoundProof: string; // hash of confirmation block(used for syncing of edge - cases)
  roundId: number; // voting round id for check
  numberOfConfirmations: number;
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
  returnQueryBoundaryBlocks?: boolean;
}

export interface ConfirmedTransactionQueryResponse {
  status: UpperBoundaryCheckStatus | "NOT_EXIST";
  transaction?: DBTransactionBase;
  lowerBoundaryBlock?: DBBlockBase;
  upperBoundaryBlock?: DBBlockBase;
}

export interface ReferencedTransactionsQueryRequest {
  deadlineBlockNumber: number;
  deadlineBlockTimestamp: number;
  numberOfConfirmations: number; 
  paymentReference: string; // payment reference
  // Used to determine overflow block - the first block with blockNumber > endBlock and timestamp > endTime
  // overflowBlockNumber: number;
  upperBoundProof: string; // hash of confirmation block of the overflow block
  roundId: number; // voting round id for check
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface ReferencedTransactionsQueryResponse {
  status: UpperBoundaryCheckStatus | "NO_OVERFLOW_BLOCK";
  transactions?: DBTransactionBase[];
  firstOverflowBlock?: DBBlockBase;
  lowerBoundaryBlock?: DBBlockBase;
}

