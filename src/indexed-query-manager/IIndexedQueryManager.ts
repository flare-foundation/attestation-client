import { EntityManager } from "typeorm";
import {
  BlockHeightSample,
  BlockQueryParams,
  BlockQueryResult,
  BlockResult,
  ConfirmedBlockQueryRequest,
  ConfirmedBlockQueryResponse,
  ConfirmedTransactionQueryRequest,
  ConfirmedTransactionQueryResponse,
  IndexedQueryManagerOptions,
  RandomTransactionOptions,
  ReferencedTransactionsQueryRequest,
  ReferencedTransactionsQueryResponse,
  TransactionQueryParams,
  TransactionQueryResult,
  TransactionResult,
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
 *   - last confirmed block number (denoted `N`) and its timestamp
 *   - highest registered block number (denoted `T`) and the timestamp of its checking
 * - the indexer ensures, that the all blocks and transactions for block in the range [`B`, `N`] are in the database, without repetitions, no gaps.
 * - Queries are carried out in for transactions in the block range [`B`, `N`].
 *
 */
export abstract class IIndexedQueryManager {
  ////////////////////////////////////////////////////////////
  // Constructor and common globals
  ////////////////////////////////////////////////////////////

  protected settings: IndexedQueryManagerOptions;

  constructor(options: IndexedQueryManagerOptions) {
    if (!options.entityManager) {
      throw new Error("unsupported without entityManager");
    }
    this.settings = options;
  }

  protected get entityManager(): EntityManager {
    return this.settings.entityManager;
  }

  ////////////////////////////////////////////////////////////
  // Last confirmed blocks, tips
  ////////////////////////////////////////////////////////////

  /**
   * Returns the number of confirmations required for a transaction and block to be considered confirmed by the indexer.
   */
  public numberOfConfirmations(): number {
    return this.settings.numberOfConfirmations();
  }

  /**
   * Returns the last confirmed block height (denoted `N`) in the indexer database for which all transactions are in database
   * @returns
   */
  public abstract getLastConfirmedBlockNumber(): Promise<number>;

  /**
   * Returns last block height (`T`) and the timestamp of the last sampling by indexer
   * @returns
   */
  public abstract getLatestBlockTimestamp(): Promise<BlockHeightSample | null>;

  ////////////////////////////////////////////////////////////
  // General confirm transaction and block queries
  ////////////////////////////////////////////////////////////

  /**
   * Carries out a transaction search with boundary synchronization, subject to query parameters
   * @param params query parameters
   * @returns an object with the list of transactions found and (optional) lowest and highest blocks of search
   * boundary range.
   */
  public abstract queryTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult>;

  /**
   * Carries out a block search with boundary synchronization, subject to query parameters
   * @param params query parameters
   * @returns an object with the block found and (optional) lowest and highest blocks of search
   * boundary range.
   */
  public abstract queryBlock(params: BlockQueryParams): Promise<BlockQueryResult>;

  /**
   * Gets a block for a given hash
   * @param hash
   * @returns the block with given hash, if exists in the indexer database, `undefined` otherwise
   */
  public abstract getBlockByHash(hash: string): Promise<BlockResult | undefined>;

  ////////////////////////////////////////////////////////////
  // Confirmed blocks query
  ////////////////////////////////////////////////////////////

  /**
   * Carries the boundary synchronized query and tries to obtain a required confirmed block from the indexer database.
   * @param params query parameters
   * @returns search status, required confirmed block, if found, and lower and upper boundary blocks, if required by
   * query parameters.
   */
  public async getConfirmedBlock(params: ConfirmedBlockQueryRequest): Promise<ConfirmedBlockQueryResponse> {
    const blockQueryResult = await this.queryBlock({
      blockNumber: params.blockNumber,
      confirmed: true,
    });
    return {
      status: blockQueryResult.result ? "OK" : "NOT_EXIST",
      block: blockQueryResult.result,
    };
  }
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
  public async getConfirmedTransaction(params: ConfirmedTransactionQueryRequest): Promise<ConfirmedTransactionQueryResponse> {
    const transactionsQueryResult = await this.queryTransactions({
      transactionId: params.txId,
    } as TransactionQueryParams);
    const transactions = transactionsQueryResult.result || [];

    return {
      status: transactions.length > 0 ? "OK" : "NOT_EXIST",
      transaction: transactions.length > 0 ? transactions[0] : undefined,
    };
  }
  ////////////////////////////////////////////////////////////
  // Referenced transactions query
  ////////////////////////////////////////////////////////////

  /**
   * Carries the boundary synchronized query and tries to obtain transactions meeting the query criteria from the indexer database.
   * @param params
   * @returns search status, list of transactions meeting query criteria, and lower and upper boundary blocks, if required by
   * query parameters.
   */
  public async getReferencedTransactions(params: ReferencedTransactionsQueryRequest): Promise<ReferencedTransactionsQueryResponse> {
    const firstOverflowBlock = await this.getFirstConfirmedOverflowBlock(params.deadlineBlockTimestamp, params.deadlineBlockNumber);
    if (!firstOverflowBlock) {
      return {
        status: "NO_OVERFLOW_BLOCK",
      };
    }

    const transactionsQueryResult = await this.queryTransactions({
      startBlockNumber: params.minimalBlockNumber,
      endBlockNumber: firstOverflowBlock.blockNumber - 1,
      paymentReference: params.paymentReference,
    } as TransactionQueryParams);

    // Too small query window
    if (!transactionsQueryResult.startBlock) {
      return {
        status: "DATA_AVAILABILITY_FAILURE",
      };
    }

    const transactions = transactionsQueryResult.result;
    return {
      status: "OK",
      transactions,
      firstOverflowBlock,
      minimalBlock: transactionsQueryResult.startBlock,
    };
  }
  ////////////////////////////////////////////////////////////
  // Special block queries
  ////////////////////////////////////////////////////////////

  /**
   * Gets the last confirmed block with the timestamp strictly smaller to the given timestamp
   * @param timestamp
   * @returns the block, if exists, otherwise `null`
   */
  public abstract getLastConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<BlockResult | undefined>;

  /**
   * Gets the first confirmed block that is strictly after timestamp and blockNumber provided in parameters
   * @param timestamp
   * @param blockNumber
   * @returns the block, if it exists, `null` otherwise
   */
  protected abstract getFirstConfirmedOverflowBlock(timestamp: number, blockNumber: number): Promise<BlockResult | undefined>;

  /**
   * Fetches random transactions selection from the indexer database in a batch, generated according to options.
   * @param batchSize
   * @param options
   */
  public abstract fetchRandomTransactions(batchSize, options: RandomTransactionOptions): Promise<TransactionResult[]>;

  /**
   * Random block selection from the indexer database in a batch.
   * @param batchSize
   * @param startTime selection is done for blocks after this timestamp
   */
  public abstract fetchRandomConfirmedBlocks(batchSize, startTime?: number): Promise<BlockResult[]>;
}
