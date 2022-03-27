import { MccClient } from "flare-mcc";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
import { DatabaseService } from "../utils/databaseService";
import { getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { getSourceName } from "../verification/sources/sources";
import { BlockHeightSample, BlockQueryParams, ConfirmedBlockQueryRequest, ConfirmedBlockQueryResponse, ConfirmedTransactionQueryRequest, ConfirmedTransactionQueryResponse, IndexedQueryManagerOptions, ReferencedTransactionsQueryRequest, ReferencedTransactionsQueryResponse, TransactionQueryParams } from "./indexed-query-manager-types";


////////////////////////////////////////////////////////
/// IndexedQueryManger
////////////////////////////////////////////////////////

export class IndexedQueryManager {
  settings: IndexedQueryManagerOptions;
  dbService: DatabaseService;
  client: MccClient;
  debugLastConfirmedBlock: number | undefined = undefined;

  transactionTable = [undefined, undefined];
  blockTable;

  constructor(options: IndexedQueryManagerOptions) {
    if (options.dbService) {
      this.dbService = options.dbService;
    } else {
      this.dbService = new DatabaseService(getGlobalLogger(), AttestationRoundManager.credentials.indexerDatabase, "indexer");
    }
    this.settings = options;
    this.prepareTables();
  }

  prepareTables() {
    let prepared = prepareIndexerTables(this.settings.chainType);
    this.transactionTable = prepared.transactionTable;
    this.blockTable = prepared.blockTable;
  }

  ////////////////////////////////////////////////////////////
  // Last confirmed blocks, tips
  ////////////////////////////////////////////////////////////
  getChainN() {
    return getSourceName(this.settings.chainType) + "_N";
  }

  getChainT() {
    return getSourceName(this.settings.chainType) + "_T";
  }

  public async getLastConfirmedBlockNumber(): Promise<number> {
    if (this.debugLastConfirmedBlock == null) {
      const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });
      if (res === undefined) {
        return 0;
      }
      return res.valueNumber;
    }
    return this.debugLastConfirmedBlock;
  }

  public async getBlockHeightSample(): Promise<BlockHeightSample | undefined> {
    if (this.debugLastConfirmedBlock == null) {
      const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainT() } });
      if (res === undefined) {
        return null;
      }
      return {
        height: res.valueNumber,
        timestamp: res.timestamp
      }
    }
    return {
      height: this.debugLastConfirmedBlock + this.settings.numberOfConfirmations(),
      timestamp: getUnixEpochTimestamp()
    }
  }

  public async isIndexerUpToDate() {
    let res = await this.getBlockHeightSample();
    let now = await getUnixEpochTimestamp();
    let delay = now - res.timestamp;
    if(delay > this.settings.maxValidIndexerDelaySec) {
      return false;
    }
    let N = await this.getLastConfirmedBlockNumber();
    if(res.height - N > this.settings.numberOfConfirmations() + 1) {
      return false;
    }
    return true;
  }

  // Allows for artificial setup of the last known confirmed block
  public async setDebugLastConfirmedBlock(blockNumber: number | undefined): Promise<number | undefined> {
    if (blockNumber == null) {
      this.debugLastConfirmedBlock = undefined;
    } else if (blockNumber >= 0) {
      this.debugLastConfirmedBlock = blockNumber;
    } else {
      this.debugLastConfirmedBlock = undefined;
      let lastBlockNumber = await this.getLastConfirmedBlockNumber();
      this.debugLastConfirmedBlock = lastBlockNumber - blockNumber;
    }
    return this.debugLastConfirmedBlock;
  }

  ////////////////////////////////////////////////////////////
  // General confirm transaction and block queries
  ////////////////////////////////////////////////////////////

  async queryTransactions(params: TransactionQueryParams): Promise<DBTransactionBase[]> {
    let results = []

    let startTimestamp = this.settings.windowStartTime(params.roundId);

    for (let table of this.transactionTable) {
      let query = this.dbService.connection.manager
        .createQueryBuilder(table, "transaction")
        .andWhere("transaction.timestamp >= :timestamp", { timestamp: startTimestamp })  // always query in the window.
        .andWhere("transaction.blockNumber <= :blockNumber", { blockNumber: params.endBlock });

      if (params.paymentReference) {
        query = query.andWhere("transaction.paymentReference=:ref", { ref: params.paymentReference });
      }
      if (params.transactionId) {
        query = query.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
      }

      results = results.concat(await query.getMany());
    }
    return results
  }

  async queryBlock(params: BlockQueryParams): Promise<DBBlockBase | null> {
    let startTimestamp = this.settings.windowStartTime(params.roundId);
    let query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      // .where("block.confirmed = :confirmed", { confirmed: !!params.confirmed })
      .andWhere("block.timestamp >= :timestamp", { timestamp: startTimestamp });
    if (params.hash) {
      query.andWhere("block.blockHash = :hash", { hash: params.hash });
    } else if (params.blockNumber) {
      query.andWhere("block.blockNumber = :blockNumber", { blockNumber: params.blockNumber });
    }
    // console.log(query.getQuery())
    let result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null;
  }

  ////////////////////////////////////////////////////////////
  // Confirmed blocks queries
  ////////////////////////////////////////////////////////////

  private async getConfirmedBlockFirstCheck(params: ConfirmedBlockQueryRequest): Promise<ConfirmedBlockQueryResponse> {

    let N = await this.getLastConfirmedBlockNumber();
    if (params.blockNumber < N - 1) {
      let block = await this.queryBlock({
        blockNumber: params.blockNumber,
        roundId: params.roundId,
        confirmed: true
      });
      return {
        status: block ? "OK" : "NOT_EXIST",
        block: block,
      };
    }
    // important to have up to date indexing
    let upToDate = await this.isIndexerUpToDate();
    if (!upToDate) {
      return { status: "RECHECK" }
    }
    // indexer is up to date
    if (params.blockNumber > N + 1) {
      return { status: "NOT_EXIST" };
    }
    // N - 1, N, N + 1
    return { status: "RECHECK" };

  }

  private async getConfirmedBlockRecheck(params: ConfirmedBlockQueryRequest): Promise<ConfirmedBlockQueryResponse> {
    let upToDate = await this.isIndexerUpToDate();
    if (!upToDate) {
      return { status: "SYSTEM_FAILURE" }
    }

    let block = await this.queryBlock({
      blockNumber: params.blockNumber,
      roundId: params.roundId,
      confirmed: true
    });
    let confirmationBlock = await this.queryBlock({
      hash: params.dataAvailabilityProof,
      roundId: params.roundId,
    } as BlockQueryParams);

    return {
      status: block && confirmationBlock && confirmationBlock.blockNumber - params.numberOfConfirmations === block.blockNumber ? "OK" : "NOT_EXIST",
      block: block
    };
  }

  public async getConfirmedBlock(params: ConfirmedBlockQueryRequest): Promise<ConfirmedBlockQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.getConfirmedBlockFirstCheck(params);
    }
    return this.getConfirmedBlockRecheck(params);
  }

  ////////////////////////////////////////////////////////////
  // Confirmed transaction queries
  ////////////////////////////////////////////////////////////

  private async getConfirmedTransactionFirstCheck(params: ConfirmedTransactionQueryRequest): Promise<ConfirmedTransactionQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    if (params.blockNumber < N - 1) {
      let transactions = await this.queryTransactions({
        roundId: params.roundId,
        endBlock: N,
        transactionId: params.txId,
      } as TransactionQueryParams);      
      return {
        status: transactions && transactions.length > 0 ? "OK" : "NOT_EXIST",
        transaction: transactions[0],
      };
    }

    // important to have up to date indexing
    let upToDate = await this.isIndexerUpToDate();
    if (!upToDate) {
      return { status: "RECHECK" }
    }
    // indexer is up to date
    if (params.blockNumber > N + 1) {
      return { status: "NOT_EXIST" };
    }
    // N - 1, N, N + 1
    return { status: "RECHECK" };

  }

  private async getConfirmedTransactionRecheck(params: ConfirmedTransactionQueryRequest): Promise<ConfirmedTransactionQueryResponse> {
    let upToDate = await this.isIndexerUpToDate();
    if (!upToDate) {
      return { status: "SYSTEM_FAILURE" }
    }

    let N = await this.getLastConfirmedBlockNumber();
    let transactions = await this.queryTransactions({
      roundId: params.roundId,
      endBlock: N,
      transactionId: params.txId,
    } as TransactionQueryParams);
    let confirmationBlock = await this.queryBlock({
      hash: params.dataAvailabilityProof,
      roundId: params.roundId,
    } as BlockQueryParams);

    return {
      status: transactions && transactions.length === 1 && confirmationBlock && confirmationBlock.blockNumber - params.numberOfConfirmations === transactions[0].blockNumber ? "OK" : "NOT_EXIST",
      transaction: transactions[0],
    };
  }

  public async getConfirmedTransaction(params: ConfirmedTransactionQueryRequest): Promise<ConfirmedTransactionQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.getConfirmedTransactionFirstCheck(params);
    }
    return this.getConfirmedTransactionRecheck(params);
  }


  ////////////////////////////////////////////////////////////
  // Referenced transactions queries
  ////////////////////////////////////////////////////////////

  private async getReferencedTransactionsFirstCheck(
    params: ReferencedTransactionsQueryRequest
  ): Promise<ReferencedTransactionsQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    if (params.overflowBlockNumber < N - 1) {   // there are still chances for getting the overflow block
      let overflowBlock = await this.queryBlock({
        blockNumber: params.overflowBlockNumber,
        roundId: params.roundId,
        confirmed: true
      } as BlockQueryParams);
      if (!overflowBlock) {
        return { status: "NO_OVERFLOW_BLOCK" };
      }
      let transactions = await this.queryTransactions({
        roundId: params.roundId,
        endBlock: overflowBlock.blockNumber - 1,
        paymentReference: params.paymentReference,
      } as TransactionQueryParams);

      return {
        status: "OK",
        transactions,
        block: overflowBlock
      };
    }

    // important to have up to date indexing
    let upToDate = await this.isIndexerUpToDate();
    if (!upToDate) {
      return { status: "RECHECK" }
    }
    // indexer is up to date
    if (params.overflowBlockNumber > N + 1) {
      return { status: "NO_OVERFLOW_BLOCK" }; // Status is still OK, but nothing was found.
    }
    // N - 1, N, N + 1
    return { status: "RECHECK" };

  }

  private async getReferencedTransactionsRecheck(
    params: ReferencedTransactionsQueryRequest
  ): Promise<ReferencedTransactionsQueryResponse> {
    let upToDate = await this.isIndexerUpToDate();
    if (!upToDate) {
      return { status: "SYSTEM_FAILURE" }
    }

    let overflowBlock = await this.queryBlock({
      blockNumber: params.overflowBlockNumber,
      roundId: params.roundId,
      confirmed: true
    } as BlockQueryParams);
    if (!overflowBlock) {
      return {
        status: "NO_OVERFLOW_BLOCK"
      }
    }

    let transactions = await this.queryTransactions({
      roundId: params.roundId,
      endBlock: overflowBlock.blockNumber - 1,
      paymentReference: params.paymentReference,
    } as TransactionQueryParams);
    let confirmationBlock = await this.queryBlock({
      hash: params.dataAvailabilityProof,
      roundId: params.roundId,
    } as BlockQueryParams);
    return {
      status: confirmationBlock && confirmationBlock.blockNumber - params.numberOfConfirmations === overflowBlock.blockNumber ? "OK" : "NO_OVERFLOW_BLOCK",
      transactions,
      block: overflowBlock,
    };
  }

  public async getReferencedTransactions(
    params: ReferencedTransactionsQueryRequest
  ): Promise<ReferencedTransactionsQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.getReferencedTransactionsFirstCheck(params);
    }
    return this.getReferencedTransactionsRecheck(params);
  }


  ////////////////////////////////////////////////////////////
  // Special block queries
  ////////////////////////////////////////////////////////////

  public async getFirstConfirmedBlockAfterTime(timestamp: number): Promise<DBBlockBase | null> {
    let query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp >= :timestamp", { timestamp: timestamp })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

    let result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null
  }

  /**
   * Get first confirmed block that is strictly after timestamp and blockNumber provided in parameters
   * @param timestamp 
   * @param blockNumber 
   */
  public async getFirstConfirmedOverflowBlock(timestamp: number, blockNumber: number): Promise<DBBlockBase | null> {
    let query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp > :timestamp", { timestamp: timestamp })
      .andWhere("block.blockNumber > :blockNumber", { blockNumber: blockNumber })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

    let result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null
  }

}
