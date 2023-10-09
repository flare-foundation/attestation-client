 import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import {
  BlockHeightSample,
  BlockQueryParams,
  BlockQueryResult,
  ConfirmedBlockQueryRequest,
  ConfirmedBlockQueryResponse,
  ConfirmedTransactionQueryRequest,
  ConfirmedTransactionQueryResponse,
  RandomTransactionOptions,
  ReferencedTransactionsQueryRequest,
  ReferencedTransactionsQueryResponse,
  TransactionQueryParams,
  TransactionQueryResult
} from "./indexed-query-manager-types";

////////////////////////////////////////////////////////
// IndexedQueryManger - a class used to carry out
// queries on the indexer database such that the
// upper and lower bounds are synchronized.
////////////////////////////////////////////////////////

/**
 * A class used to carry out queries on the indexer database such that the upper and lower bounds are synchronized.
 */
export interface IIndexedQueryManager {

  ////////////////////////////////////////////////////////////
  // Last confirmed blocks, tips
  ////////////////////////////////////////////////////////////


  /**
   * Returns the last confirmed block height (`N`) for which all transactions are in database
   * @returns
   */
  getLastConfirmedBlockNumber(): Promise<number>;
  
  /**
   * Returns last block height (`T`) and the timestamp of the last sampling by indexer
   * @returns
   */
  getLatestBlockTimestamp(): Promise<BlockHeightSample | null>;

  numberOfConfirmations(): number;
  ////////////////////////////////////////////////////////////
  // General confirm transaction and block queries
  ////////////////////////////////////////////////////////////

  /**
   * Carries out a transaction search with boundary synchronization, subject to query parameters
   * @param params query parameters
   * @returns an object with the list of transactions found and (optional) lowest and highest blocks of search
   * boundary range.
   */
  queryTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult>;

  /**
   * Carries out a block search with boundary synchronization, subject to query parameters
   * @param params query parameters
   * @returns an object with the block found and (optional) lowest and highest blocks of search
   * boundary range.
   */
  queryBlock(params: BlockQueryParams): Promise<BlockQueryResult>;

  /**
   * Gets a block for a given hash
   * @param hash
   * @returns the block with given hash, if exists, `null` otherwise
   */
  getBlockByHash(hash: string): Promise<DBBlockBase | null>;

  ////////////////////////////////////////////////////////////
  // Confirmed blocks query
  ////////////////////////////////////////////////////////////

  /**
   * Carries the boundary synchronized query and tries to obtain a required confirmed block from the indexer database.
   * @param params query parameters
   * @returns search status, required confirmed block, if found, and lower and upper boundary blocks, if required by
   * query parameters.
   */
  getConfirmedBlock(params: ConfirmedBlockQueryRequest): Promise<ConfirmedBlockQueryResponse>;

  ////////////////////////////////////////////////////////////
  // Confirmed transaction query
  ////////////////////////////////////////////////////////////

  /**
   * Carries the boundary synchronized query and tries to obtain transaction meeting the query criteria from the indexer database.
   * @param params
   * @returns search status, required
   * transaction block, if found,
   * lower and upper boundary blocks, if required by query parameters.
   */
  getConfirmedTransaction(params: ConfirmedTransactionQueryRequest): Promise<ConfirmedTransactionQueryResponse>;

  ////////////////////////////////////////////////////////////
  // Referenced transactions query
  ////////////////////////////////////////////////////////////

  /**
   * Carries the boundary synchronized query and tries to obtain transactions meeting the query criteria from the indexer database.
   * @param params
   * @returns search status, list of transactions meeting query criteria, and lower and upper boundary blocks, if required by
   * query parameters.
   */
  getReferencedTransactions(params: ReferencedTransactionsQueryRequest): Promise<ReferencedTransactionsQueryResponse>;

  ////////////////////////////////////////////////////////////
  // Special block queries
  ////////////////////////////////////////////////////////////

  /**
   * Gets the last confirmed block with the timestamp strictly smaller to the given timestamp
   * @param timestamp
   * @returns the block, if exists, otherwise `null`
   */
  getLastConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<DBBlockBase | null>;

  fetchRandomTransactions(batchSize, options: RandomTransactionOptions): Promise<DBTransactionBase[]>;
  fetchRandomConfirmedBlocks(batchSize, startTime?: number): Promise<DBBlockBase[]>;
}
