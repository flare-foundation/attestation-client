import { MCC } from "@flarenetwork/mcc";
import { DBBlockBase, IDBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase, IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
import { IIndexedQueryManager } from "./IIndexedQueryManager";
import {
  BlockHeightSample,
  BlockQueryParams,
  BlockQueryResult,
  BlockResult,
  IndexedQueryManagerOptions,
  RandomTransactionOptions,
  TransactionQueryParams,
  TransactionQueryResult,
} from "./indexed-query-manager-types";

////////////////////////////////////////////////////////
// IndexedQueryManger - a class used to carry out
// queries on the indexer database such that the
// upper and lower bounds are synchronized.
////////////////////////////////////////////////////////

/**
 * A class used to carry out queries on the indexer database such that the upper and lower bounds are synchronized.
 */
export class IndexedQueryManager extends IIndexedQueryManager {
  //Two transaction table entities `transaction0` and `transaction1`
  private transactionTable: IDBTransactionBase[];

  // Block table entity
  private blockTable: IDBBlockBase;

  constructor(options: IndexedQueryManagerOptions) {
    super(options);
    this.prepareTables();
  }

  /**
   * Prepares the table variables containing transaction and block entities
   */
  private prepareTables() {
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
  private getChainN() {
    return `${MCC.getChainTypeName(this.settings.chainType)}_N`;
  }

  /**
   * Identifier name for the block height (`T`) in the database State table
   * @returns identifier name for value `T`
   */
  private getChainT() {
    return `${MCC.getChainTypeName(this.settings.chainType)}_T`;
  }

  public async getLastConfirmedBlockNumber(): Promise<number> {
    const res = await this.entityManager.findOne(DBState, { where: { name: this.getChainN() } });
    if (res === undefined || res === null) {
      return 0;
    }
    return res.valueNumber;
  }

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

  ////////////////////////////////////////////////////////////
  // General confirm transaction and block queries
  ////////////////////////////////////////////////////////////

  public async queryTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult> {
    let results: DBTransactionBase[] = [];

    for (const table of this.transactionTable) {
      let query = this.entityManager.createQueryBuilder(table, "transaction");

      if (params.startBlockNumber) {
        query = query.andWhere("transaction.blockNumber >= :startBlock", { startBlock: params.startBlockNumber });
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
    let lowerQueryWindowBlock: BlockResult;
    let upperQueryWindowBlock: BlockResult;

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

  public async queryBlock(params: BlockQueryParams): Promise<BlockQueryResult> {
    if (!params.blockNumber && !params.hash) {
      throw new Error("One of 'blockNumber' or 'hash' is a mandatory parameter");
    }
    let query = this.entityManager.createQueryBuilder(this.blockTable, "block");
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

  public async getBlockByHash(hash: string): Promise<DBBlockBase | undefined> {
    const query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.blockHash = :hash", { hash: hash });
    const result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return undefined;
  }

  ////////////////////////////////////////////////////////////
  // Special block queries
  ////////////////////////////////////////////////////////////

  public async getLastConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<BlockResult | undefined> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp < :timestamp", { timestamp: timestamp })
      .orderBy("block.blockNumber", "DESC")
      .limit(1);

    return query.getOne();
  }

  /**
   * Gets the first confirmed block that is strictly after timestamp and blockNumber provided in parameters
   * @param timestamp
   * @param blockNumber
   * @returns the block, if it exists, `null` otherwise
   */
  protected async getFirstConfirmedOverflowBlock(timestamp: number, blockNumber: number): Promise<BlockResult | undefined> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp > :timestamp", { timestamp: timestamp })
      .andWhere("block.blockNumber > :blockNumber", { blockNumber: blockNumber })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

    return query.getOne();
  }

  public async fetchRandomTransactions(batchSize = 100, options: RandomTransactionOptions): Promise<DBTransactionBase[]> {
    let result: DBTransactionBase[] = [];
    let maxReps = 10;
    while (result.length === 0) {
      let tableId = 0;
      if (process.env.TEST_CREDENTIALS) {
        tableId = 0;
      } else {
        tableId = Math.round(Math.random());
      }

      const table = this.transactionTable[tableId];

      const maxQuery = this.entityManager.createQueryBuilder(table, "transaction").select("MAX(transaction.id)", "max");
      const res = await maxQuery.getRawOne();
      if (!res.max) {
        maxReps--;
        if (maxReps === 0) {
          return [];
        }
        continue;
      }
      const randN = Math.floor(Math.random() * res.max);
      let query = this.entityManager.createQueryBuilder(table, "transaction").andWhere("transaction.id > :max", { max: randN });
      // .andWhere("transaction.id < :upper", {upper: randN + 100000})

      if (options.mustHavePaymentReference) {
        query = query.andWhere("transaction.paymentReference != ''");
      }
      if (options.mustNotHavePaymentReference) {
        query = query.andWhere("transaction.paymentReference == ''");
      }
      if (options.mustBeNativePayment) {
        query = query.andWhere("transaction.isNativePayment = 1");
      }
      if (options.mustNotBeNativePayment) {
        query = query.andWhere("transaction.isNativePayment = 0");
      }
      if (options.startTime) {
        query = query.andWhere("transaction.timestamp >= :startTime", { startTime: options.startTime });
      }
      query = query.limit(batchSize);
      result = (await query.getMany()) as DBTransactionBase[];
    }

    return result;
  }

  public async fetchRandomConfirmedBlocks(batchSize = 100, startTime?: number): Promise<DBBlockBase[]> {
    let query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.confirmed = :confirmed", { confirmed: true });
    if (startTime) {
      query = query.andWhere("block.timestamp >= :startTime", { startTime });
    }
    if (process.env.NODE_ENV === "development" && this.entityManager.connection.options.type == "better-sqlite3") {
      query = query.orderBy("RANDOM()").limit(batchSize);
    } else {
      query = query.orderBy("RAND()").limit(batchSize);
    }

    return (await query.getMany()) as DBBlockBase[];
  }
}
