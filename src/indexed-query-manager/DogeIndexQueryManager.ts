import { ZERO_PAYMENT_REFERENCE } from "../../test/indexed-query-manager/utils/indexerTestDataGenerator";
import {
  DBDogeIndexerBlock,
  DBDogeTransaction,
  IDBDogeTransaction,
  IDEDogeIndexerBlock,
  ITipSyncState,
  TipSyncState,
} from "../entity-external/DogeExternalEntities";
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
  TransactionResult,
} from "./indexed-query-manager-types";

////////////////////////////////////////////////////////
// IndexedQueryManger - a class used to carry out
// queries on the indexer database such that the
// upper and lower bounds are synchronized.
////////////////////////////////////////////////////////

/**
 * A class used to carry out queries on the indexer database such that the upper and lower bounds are synchronized.
 */
export class DogeIndexedQueryManager extends IIndexedQueryManager {
  // Block table entity
  private transactionTable: IDBDogeTransaction;
  private blockTable: IDEDogeIndexerBlock;
  private tipState: ITipSyncState;

  constructor(options: IndexedQueryManagerOptions) {
    super(options);
    this.transactionTable = DBDogeTransaction;
    this.blockTable = DBDogeIndexerBlock;
    this.tipState = TipSyncState;
  }

  public numberOfConfirmations(): number {
    return this.settings.numberOfConfirmations();
  }

  ////////////////////////////////////////////////////////////
  // Last confirmed blocks, tips
  ////////////////////////////////////////////////////////////

  private async _getTipStateObject(): Promise<TipSyncState> {
    const res = await this.entityManager.findOne(this.tipState, {});
    if (res === undefined || res === null) {
      throw new Error("Cant find tip sync state in DB");
    }
    return res;
  }

  // /**
  //  * Identifier name for the last confirmed block (`N`) in the database State table
  //  * @returns identifier name for value `N`
  //  */
  // private getChainN() {
  //   return `${MCC.getChainTypeName(this.settings.chainType)}_N`;
  // }

  // /**
  //  * Identifier name for the block height (`T`) in the database State table
  //  * @returns identifier name for value `T`
  //  */
  // private getChainT() {
  //   return `${MCC.getChainTypeName(this.settings.chainType)}_T`;
  // }

  // TODO: Ready
  public async getLastConfirmedBlockNumber(): Promise<number> {
    try {
      const tipState = await this._getTipStateObject();
      return tipState.latestIndexedHeight;
    } catch {
      // TODO: Print or at least log this
      return 0;
    }
  }

  // TODO: Ready
  public async getLatestBlockTimestamp(): Promise<BlockHeightSample | null> {
    try {
      const tipState = await this._getTipStateObject();
      return {
        height: tipState.latestTipHeight,
        timestamp: tipState.timestamp,
      };
    } catch {
      // TODO: Print or at least log this
      return null;
    }
  }

  ////////////////////////////////////////////////////////////
  // General confirm transaction and block queries
  ////////////////////////////////////////////////////////////

  // TODO: WIP
  public async queryTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult> {
    let query = this.entityManager.createQueryBuilder(this.transactionTable, "transaction");

    if (params.transactionId) {
      query = query.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
    }

    if (params.startBlockNumber) {
      query = query.andWhere("transaction.blockNumber >= :startBlock", { startBlock: params.startBlockNumber });
    }

    if (params.endBlockNumber) {
      query = query.andWhere("transaction.blockNumber <= :endBlock", { endBlock: params.endBlockNumber });
    }

    if (params.paymentReference) {
      query = query.andWhere("transaction.paymentReference=:ref", { ref: params.paymentReference });
    }

    // left join all of the inputs and outputs
    query = query.leftJoinAndSelect("transaction.transactionoutput_set", "transactionOutput");
    query = query.leftJoinAndSelect("transaction.transactioninputcoinbase_set", "transactionInputCoinbase");
    query = query.leftJoinAndSelect("transaction.transactioninput_set", "transactionInput");

    const res = await query.getMany();

    const result = res.map((val) => val.toTransactionResult());

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
      result,
      startBlock: lowerQueryWindowBlock,
      endBlock: upperQueryWindowBlock,
    };
  }

  // TODO: Ready
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
    if (result) {
      return {
        result: result.toBlockResult(),
      };
    }
    return {
      result: undefined,
    };
  }

  // TODO: Ready
  public async getBlockByHash(hash: string): Promise<BlockResult | undefined> {
    const query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.blockHash = :hash", { hash: hash });
    const result = await query.getOne();
    if (result) {
      return result.toBlockResult();
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

    return (await query.getOne()).toBlockResult();
  }

  protected async getFirstConfirmedOverflowBlock(timestamp: number, blockNumber: number): Promise<BlockResult | undefined> {
    const query = this.entityManager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp > :timestamp", { timestamp: timestamp })
      .andWhere("block.blockNumber > :blockNumber", { blockNumber: blockNumber })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

    return (await query.getOne()).toBlockResult();
  }

  public async fetchRandomTransactions(batchSize = 100, options: RandomTransactionOptions): Promise<TransactionResult[]> {
    const txCount = await this.entityManager.createQueryBuilder(this.transactionTable, "transaction").getCount();

    if (txCount === 0) {
      return [];
    }

    const randN = Math.floor(Math.random() * txCount);

    let query = this.entityManager.createQueryBuilder(this.transactionTable, "transaction");

    ZERO_PAYMENT_REFERENCE;

    if (options.mustHavePaymentReference) {
      query = query.andWhere(`transaction.paymentReference != '${ZERO_PAYMENT_REFERENCE}'`);
    }
    if (options.mustNotHavePaymentReference) {
      query = query.andWhere(`transaction.paymentReference = '${ZERO_PAYMENT_REFERENCE}'`);
    }
    if (options.mustBeNativePayment) {
      query = query.andWhere("transaction.isNativePayment = true");
    }
    if (options.mustNotBeNativePayment) {
      query = query.andWhere("transaction.isNativePayment = false");
    }
    if (options.startTime) {
      query = query.andWhere("transaction.timestamp >= :startTime", { startTime: options.startTime });
    }

    query = query.leftJoinAndSelect("transaction.transactionoutput_set", "transactionOutput");
    query = query.leftJoinAndSelect("transaction.transactioninputcoinbase_set", "transactionInputCoinbase");
    query = query.leftJoinAndSelect("transaction.transactioninput_set", "transactionInput");

    query = query.limit(batchSize).offset(Math.min(randN, txCount - batchSize));

    let transactions = await query.getMany();
    return transactions.map((trans) => trans.toTransactionResult());
  }

  public async fetchRandomConfirmedBlocks(batchSize = 100, startTime?: number): Promise<BlockResult[]> {
    let query = this.entityManager.createQueryBuilder(this.blockTable, "block").where("block.confirmed = :confirmed", { confirmed: true });
    if (startTime) {
      query = query.andWhere("block.timestamp >= :startTime", { startTime });
    }
    if (process.env.NODE_ENV === "development" && this.entityManager.connection.options.type == "better-sqlite3") {
      query = query.orderBy("RANDOM()").limit(batchSize);
    } else {
      query = query.orderBy("RANDOM()").limit(batchSize);
    }

    const blocks = await query.getMany();

    return blocks.map((block) => block.toBlockResult());
  }
}
