import { ChainType } from "flare-mcc";
import { DBBlockBase } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";

export interface IndexedQueryManagerOptions {
   chainType: ChainType;
   // number of confirmations required
   noConfirmations: number;
   // return windows start time from current epochId
   windowStartTime: (epochId: number) => number;
 }
 
 ////////////////////////////////////////////////////////
 /// General query params
 ////////////////////////////////////////////////////////
 
 export interface TransactionQueryParams {
   roundId: number;
   startBlock?: number;
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
 
 export interface BlockNumberQueryRequest {
   blockNumber: number;
   roundId: number;
   dataAvailabilityProof: string; // hash of confirmation block(used for syncing of edge - cases)
   type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
 }
 
 export interface BlockNumberQueryResponse {
   status: "OK" | "RECHECK" | "NOT_EXIST";
   block?: DBBlockBase;
 }
 
 export interface TransactionExistenceQueryRequest {
   txId: string; // transaction id
   blockNumber: number; // block number for the transaction with `txId
   dataAvailabilityProof: string; // hash of confirmation block(used for syncing of edge - cases)
   roundId: number; // voting round id for check
   type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
 }
 
 export interface TransactionExistenceQueryResponse {
   status: "OK" | "RECHECK" | "NOT_EXIST";
   transaction?: DBTransactionBase;
 }
 
 export interface ReferencedTransactionsQueryRequest {
   paymentReference: string; // payment reference
   startBlock: number; // starting block for search. Overrides default starting time.
   // Used to determine overflow block - the first block with blockNumber > endBlock and timestamp > endTime
   endBlock: number;
   endTime: number;
   dataAvailabilityProof: string; // hash of confirmation block of the overflow block
   roundId: number; // voting round id for check
   type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
 }
 
 export interface ReferencedTransactionsQueryResponse {
   status: "OK" | "RECHECK" | "NO_OVERFLOW_BLOCK";
   transactions?: DBTransactionBase[];
   block?: DBBlockBase;
 }