import {
  BlockHeightSample,
  BlockQueryParams,
  BlockQueryResult,
  BlockResult,
  ConfirmedBlockQueryRequest,
  ConfirmedBlockQueryResponse,
  ConfirmedTransactionQueryRequest,
  ConfirmedTransactionQueryResponse,
  RandomTransactionOptions,
  ReferencedTransactionsQueryRequest,
  ReferencedTransactionsQueryResponse,
  TransactionQueryParams,
  TransactionQueryResult,
  TransactionResult
} from "./indexed-query-manager-types";

////////////////////////////////////////////////////////
// IndexedQueryManger - a class used to carry out
// queries on the indexer database such that the
// upper and lower bounds are synchronized.
////////////////////////////////////////////////////////

/**
 * A class used to carry out specific queries on the indexer database.
 * Assumption for the database are:
 * - limited history of blocks and transactions is stored in the database
 * - the database holds the state table, which contains the data about:
 *   - bottom block number (denoted `B`) and its timestamp
 *   - last confimed block number (denoted `N`) and its timestamp
 *   - highest registered block number (denoted `T`) and the timestamp of its checking
 * - the indexer ensures, that the all blocks and transactions for block in the range [`B`, `N`] are in the database, without repetitions, no gaps. 
 * - Queries are carried out in for transactions in the block range [`B`, `N`].
 * 
 */
export interface IIndexedQueryManager {

  ////////////////////////////////////////////////////////////
  // Last confirmed blocks, tips
  ////////////////////////////////////////////////////////////


  /**
   * Returns the last confirmed block height (denoted `N`) in the indexer database for which all transactions are in database
   * @returns
   */
  getLastConfirmedBlockNumber(): Promise<number>;
  
  /**
   * Returns last block height (`T`) and the timestamp of the last sampling by indexer
   * @returns
   */
  getLatestBlockTimestamp(): Promise<BlockHeightSample | null>;

  /**
   * Returns the number of confirmations required for a transaction and block to be considered confirmed by the indexer.
   */
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
   * @returns the block with given hash, if exists in the indexer database, `undefined` otherwise
   */
  getBlockByHash(hash: string): Promise<BlockResult | undefined>;

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
  getLastConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<BlockResult | undefined>;

  /**
   * Fetches random transactions selection from the indexer database in a batch, generated according to options.
   * @param batchSize 
   * @param options 
   */
  fetchRandomTransactions(batchSize, options: RandomTransactionOptions): Promise<TransactionResult[]>;

  /**
   * Random block selection from the indexer database in a batch.
   * @param batchSize 
   * @param startTime selection is done for blocks after this timestamp
   */
  fetchRandomConfirmedBlocks(batchSize, startTime?: number): Promise<BlockResult[]>;
}
