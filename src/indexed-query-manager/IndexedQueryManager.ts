import { MccClient } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DBBlockBase, IDBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase, IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
import { getUnixEpochTimestamp } from "../utils/helpers/utils";
import { getSourceName } from "../verification/sources/sources";
import {
  BlockHeightSample,
  BlockQueryParams,
  BlockQueryResult,
  ConfirmedBlockQueryRequest,
  ConfirmedBlockQueryResponse,
  ConfirmedTransactionQueryRequest,
  ConfirmedTransactionQueryResponse,
  IndexedQueryManagerOptions,
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
export class IndexedQueryManager {
  settings: IndexedQueryManagerOptions;

  //Two transaction table entities `transaction0` and `transaction1`
  transactionTable: IDBTransactionBase[];

  // Block table entity
  blockTable: IDBBlockBase;

  constructor(options: IndexedQueryManagerOptions) {
    // assert existence
    if (!options.entityManager) {
      throw new Error("unsupported without entityManager");
    }
    this.settings = options;
    this.prepareTables();
  }

  get entityManager(): EntityManager {
    return this.settings.entityManager;
  }

  /**
   * Prepares the table variables containing transaction and block entities
   */
  prepareTables() {
    const prepared = prepareIndexerTables(this.settings.chainType);
    this.transactionTable = prepared.transactionTable;
    this.blockTable = prepared.blockTable;
  }

  ////////////////////////////////////////////////////////////
  // Last confirmed blocks, tips
  ////////////////////////////////////////////////////////////

  /**
   * Identifier name for the last confirmed block (`N`) in the database State table
   * @returns identifier name for value `N`
   */
  getChainN() {
    return `${getSourceName(this.settings.chainType)}_N`;
  }

  /**
   * Identifier name for the block height (`T`) in the database State table
   * @returns identifier name for value `T`
   */
  getChainT() {
    return `${getSourceName(this.settings.chainType)}_T`;
  }

  /**
   * Returns the last confirmed block height (`N`) for which all transactions are in database
   * @returns
   */
  public async getLastConfirmedBlockNumber(): Promise<number> {
    const res = await this.entityManager.findOne(DBState, { where: { name: this.getChainN() } });
    if (res === undefined || res === null) {
      return 0;
    }
    return res.valueNumber;
  }

  /**
   * Returns last block height (`T`) and the timestamp of the last sampling by indexer
   * @returns
   */
  public async getLatestBlockTimestamp(): Promise<BlockHeightSample | null> {
    const res = await this.entityManager.findOne(DBState, { where: { name: this.getChainT() } });
    if (res === undefined || res === null) {
      return null;
    }
    return {
      height: res.valueNumber,
      timestamp: res.timestamp,
    } as BlockHeightSample;
  }

  /**
   * Checks whether the sampling of the block height of the indexer is up to date.
   * The last sample must be within `maxValidIndexerDelaySec` value (in options)
   * @returns `true` if the indexer is up to date, `false` otherwise
   */
  public async isIndexerUpToDate(): Promise<boolean> {
    const res = await this.getLatestBlockTimestamp();
    if (res === null) {
      return false;
    }
    const now = getUnixEpochTimestamp();
    const delay = now - res.timestamp;
    if (delay > this.settings.maxValidIndexerDelaySec) {
      return false;
    }
    return true;
  }

  ////////////////////////////////////////////////////////////
  // General confirm transaction and block queries
  ////////////////////////////////////////////////////////////

  /**
   * Carries out a transaction search with boundary synchronization, subject to query parameters
   * @param params query parameters
   * @returns an object with the list of transactions found and (optional) lowest and highest blocks of search
   * boundary range.
   */
  async queryTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult> {
    let results = [];

    for (const table of this.transactionTable) {
      let query = this.entityManager
        .createQueryBuilder(table, "transaction")

      if (params.startBlockNumber) {
        query = query.andWhere("transaction.blockNumber >= :startBlock", { startBlock : params.startBlockNumber });
      }

      if (params.endBlockNumber) {
        query = query.andWhere("transaction.blockNumber <= :endBlock", { endBlock: params.endBlockNumber });
      }

      if (params.paymentReference) {
        query = query.andWhere("transaction.paymentReference=:ref", { ref: params.paymentReference });
      }
      if (params.transactionId) {
        query = query.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
      }

      results = results.concat(await query.getMany());
    }
    let lowerQueryWindowBlock: DBBlockBase;
    let upperQueryWindowBlock: DBBlockBase;

    if (params.startBlockNumber !== undefined) {
      const lowerQueryWindowBlockResult = await this.queryBlock({
        blockNumber: params.startBlockNumber,
        confirmed: true,
      });
      lowerQueryWindowBlock = lowerQueryWindowBlockResult.result;
    }

    if (params.endBlockNumber !== undefined) {
      const upperQueryWindowBlockResult = await this.queryBlock({
        blockNumber: params.endBlockNumber,
        confirmed: true,
      });
      upperQueryWindowBlock = upperQueryWindowBlockResult.result;
    }
    return {
      result: results as DBTransactionBase[],
      startBlock: lowerQueryWindowBlock,
      endBlock: upperQueryWindowBlock,
    };
  }

  /**
   * Carries out a block search with boundary synchronization, subject to query parameters
   * @param params query parameters
   * @returns an object with the block found and (optional) lowest and highest blocks of search
   * boundary range.
   */
  async queryBlock(params: BlockQueryParams): Promise<BlockQueryResult> {
    if (!params.blockNumber && !params.hash) {
      throw new Error("One of 'blockNumber' or 'hash' is a mandatory parameter");
    }
    let query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
    if (params.confirmed) {
      query = query.andWhere("block.confirmed = :confirmed", { confirmed: !!params.confirmed });
    }
    if (params.hash) {
      query.andWhere("block.blockHash = :hash", { hash: params.hash });
    } else if (params.blockNumber) {
      query.andWhere("block.blockNumber = :blockNumber", { blockNumber: params.blockNumber });
    }

    const result = await query.getOne();
    return {
      result: result ? (result as DBBlockBase) : undefined,
    };
  }

  /**
   * Gets a block for a given hash
   * @param hash
   * @returns the block with given hash, if exists, `null` otherwise
   */
  async getBlockByHash(hash: string): Promise<DBBlockBase | null> {
    const query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.blockHash = :hash", { hash: hash });
    const result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null;
  }

  // /**
  //  * Checks whether lower boundary of query range within confirmed transactions is met.
  //  * For that at least one confirmed block with lower timestamp that lower boundary timestamp
  //  * must exist in the database.
  //  * @param roundId
  //  * @returns
  //  */
  // private async lowerBoundaryCheck(roundId: number, windowStartTime?: number): Promise<boolean> {
  //   // lower boundary timestamp
  //   let startTimestamp = windowStartTime;
  //   if (!startTimestamp && startTimestamp !== 0) {
  //     if (this.settings.windowStartTime) {
  //       startTimestamp = this.settings.windowStartTime(roundId);
  //     } else {
  //       throw new Error("IndexedQueryManager: windowStartTime not configured");
  //     }
  //   }

  //   return await this.hasIndexerConfirmedBlockStrictlyBeforeTime(startTimestamp);
  // }

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
      confirmed: true
    });
    return {
      status: blockQueryResult ? "OK" : "NOT_EXIST",
      block: blockQueryResult?.result
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
      transaction: transactions[0],
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
        status: "DATA_AVAILABILITY_FAILURE"
      }
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
   * Gets the first confirmed block with the timestamp greater or equal to the given
   * timestamp
   * @param timestamp
   * @returns the block, if exists, otherwise `null`
   */
  public async getFirstConfirmedBlockAfterTime(timestamp: number): Promise<DBBlockBase | null> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp >= :timestamp", { timestamp: timestamp })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

      return query.getOne();
  }

  /**
   * Gets the last confirmed block with the timestamp strictly smaller to the given timestamp
   * @param timestamp
   * @returns the block, if exists, otherwise `null`
   */
  public async getLastConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<DBBlockBase | null> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp < :timestamp", { timestamp: timestamp })
      .orderBy("block.blockNumber", "DESC")
      .limit(1);

    return query.getOne();
  }

  /**
   * Checks whether there is a confirmed block with timestamp strictly before given timestamp in the
   * indexer database
   * @param timestamp
   * @returns `true` if the block exists, `false` otherwise
   */
  public async hasIndexerConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<boolean> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp < :timestamp", { timestamp: timestamp })
      .orderBy("block.timestamp", "DESC")
      .limit(1);
    const results = (await query.getMany()) as DBBlockBase[];
    return results.length === 1;
  }

  /**
   * Gets the first confirmed block that is strictly after timestamp and blockNumber provided in parameters
   * @param timestamp
   * @param blockNumber
   * @returns the block, if it exists, `null` otherwise
   */
  public async getFirstConfirmedOverflowBlock(timestamp: number, blockNumber: number): Promise<DBBlockBase | null> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp > :timestamp", { timestamp: timestamp })
      .andWhere("block.blockNumber > :blockNumber", { blockNumber: blockNumber })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

    return query.getOne();
  }
}
