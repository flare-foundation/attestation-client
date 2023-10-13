import { MCC } from "@flarenetwork/mcc";
import { EntityManager } from "typeorm";
import { DBBlockBase, DBDogeIndexerBlock, IDBBlockBase, IDEDogeIndexerBlock } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBDogeTransaction, DBTransactionBase, IDBDogeTransaction, IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
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
} from "./indexed-query-manager-types";
import { IIndexedQueryManager } from "./IIndexedQueryManager";

////////////////////////////////////////////////////////
// IndexedQueryManger - a class used to carry out
// queries on the indexer database such that the
// upper and lower bounds are synchronized.
////////////////////////////////////////////////////////

/**
 * A class used to carry out queries on the indexer database such that the upper and lower bounds are synchronized.
 */
export class DogeIndexedQueryManager extends IIndexedQueryManager {
  private settings: IndexedQueryManagerOptions;

  private transactionTable: IDBDogeTransaction;

  // Block table entity
  private blockTable: IDEDogeIndexerBlock;

  constructor(options: IndexedQueryManagerOptions) {
    super()
    this.transactionTable = DBDogeTransaction
    this.blockTable = DBDogeIndexerBlock
    // assert existence
    if (!options.entityManager) {
      throw new Error("unsupported without entityManager");
    }
    this.settings = options;
  }
  public numberOfConfirmations(): number {
    return this.settings.numberOfConfirmations();
  }

  private get entityManager(): EntityManager {
    return this.settings.entityManager;
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

    let query = this.entityManager.createQueryBuilder(this.transactionTable, "transaction")

    if(params.transactionId){
      query = query.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
    }

    const res =  await query.orderBy("transaction.transactionId").leftJoinAndSelect("transaction.transactionoutput_set", "transactionOutput").getMany();

    return {
      result: res.map(val => val.toTransactionResult()),
    }

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
      query.andWhere("block.block_hash = :hash", { hash: params.hash });
    } else if (params.blockNumber) {
      query.andWhere("block.block_number = :blockNumber", { blockNumber: params.blockNumber });
    }

    const result = await query.getOne();
    if(result){
      return {
        result: result.toBlockResult()
      }
    }
    return {
      result: undefined
    }
  }

  public async getBlockByHash(hash: string): Promise<BlockResult | undefined> {
    const query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.block_hash = :hash", { hash: hash });
    const result = await query.getOne();
    if (result) {
      return result.toBlockResult();
    }
    return undefined;
  }

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
      status: blockQueryResult?.result ? "OK" : "NOT_EXIST",
      block: blockQueryResult?.result,
    };
  }

  ////////////////////////////////////////////////////////////
  // Confirmed transaction query
  ////////////////////////////////////////////////////////////

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

  public async getLastConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<DBBlockBase | undefined> {
    // const query = this.entityManager
    //   .createQueryBuilder(this.blockTable, "block")
    //   .where("block.confirmed = :confirmed", { confirmed: true })
    //   .andWhere("block.timestamp < :timestamp", { timestamp: timestamp })
    //   .orderBy("block.blockNumber", "DESC")
    //   .limit(1);

    // return query.getOne();
    throw new Error("Not implemented")
  }

  /**
   * Gets the first confirmed block that is strictly after timestamp and blockNumber provided in parameters
   * @param timestamp
   * @param blockNumber
   * @returns the block, if it exists, `null` otherwise
   */
  private async getFirstConfirmedOverflowBlock(timestamp: number, blockNumber: number): Promise<DBBlockBase | undefined> {
    // const query = this.entityManager
    //   .createQueryBuilder(this.blockTable, "block")
    //   .where("block.confirmed = :confirmed", { confirmed: true })
    //   .andWhere("block.timestamp > :timestamp", { timestamp: timestamp })
    //   .andWhere("block.blockNumber > :blockNumber", { blockNumber: blockNumber })
    //   .orderBy("block.blockNumber", "ASC")
    //   .limit(1);

    // return query.getOne();
    throw new Error("Not implemented")
  }


  public async fetchRandomTransactions(batchSize = 100, options: RandomTransactionOptions): Promise<DBTransactionBase[]> {
    // let result: DBTransactionBase[] = [];
    // let maxReps = 10;
    // while (result.length === 0) {
    //   let tableId = 0;
    //   if (process.env.TEST_CREDENTIALS) {
    //     tableId = 0;
    //   } else {
    //     tableId = Math.round(Math.random());
    //   }

    //   const table = this.transactionTable[tableId];

    //   const maxQuery = this.entityManager.createQueryBuilder(table, "transaction").select("MAX(transaction.id)", "max");
    //   const res = await maxQuery.getRawOne();
    //   if (!res.max) {
    //     maxReps--;
    //     if (maxReps === 0) {
    //       return [];
    //     }
    //     continue;
    //   }
    //   const randN = Math.floor(Math.random() * res.max);
    //   let query = this.entityManager.createQueryBuilder(table, "transaction").andWhere("transaction.id > :max", { max: randN });
    //   // .andWhere("transaction.id < :upper", {upper: randN + 100000})

    //   if (options.mustHavePaymentReference) {
    //     query = query.andWhere("transaction.paymentReference != ''");
    //   }
    //   if (options.mustNotHavePaymentReference) {
    //     query = query.andWhere("transaction.paymentReference == ''");
    //   }
    //   if (options.mustBeNativePayment) {
    //     query = query.andWhere("transaction.isNativePayment = 1");
    //   }
    //   if (options.mustNotBeNativePayment) {
    //     query = query.andWhere("transaction.isNativePayment = 0");
    //   }
    //   if (options.startTime) {
    //     query = query.andWhere("transaction.timestamp >= :startTime", { startTime: options.startTime });
    //   }
    //   query = query
    //     //.orderBy("transaction.id")
    //     .limit(batchSize);
    //   result = (await query.getMany()) as DBTransactionBase[];
    // }

    // return result;
    throw new Error("Not implemented")
  }

  public async fetchRandomConfirmedBlocks(batchSize = 100, startTime?: number): Promise<DBBlockBase[]> {
    // let query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.confirmed = :confirmed", { confirmed: true });
    // if (startTime) {
    //   query = query.andWhere("block.timestamp >= :startTime", { startTime });
    // }
    // if (process.env.NODE_ENV === "development" && this.entityManager.connection.options.type == "better-sqlite3") {
    //   query = query.orderBy("RANDOM()").limit(batchSize);
    // } else {
    //   query = query.orderBy("RAND()").limit(batchSize);
    // }

    // return (await query.getMany()) as DBBlockBase[];
    throw new Error("Not implemented")
  }

}
