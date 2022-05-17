import { MccClient, unPrefix0x } from "@flarenetwork/mcc";
import { AttestationRoundManager } from "../attester/AttestationRoundManager";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
import { DatabaseService } from "../utils/databaseService";
import { getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { getSourceName } from "../verification/sources/sources";
import { BlockHeightSample, BlockQueryParams, BlockQueryResult, ConfirmedBlockQueryRequest, ConfirmedBlockQueryResponse, ConfirmedTransactionQueryRequest, ConfirmedTransactionQueryResponse, IndexedQueryManagerOptions, ReferencedTransactionsQueryRequest, ReferencedTransactionsQueryResponse, TransactionQueryParams, TransactionQueryResult, UpperBoundaryCheck } from "./indexed-query-manager-types";


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
    if (delay > this.settings.maxValidIndexerDelaySec) {
      return false;
    }
    let N = await this.getLastConfirmedBlockNumber();
    if (res.height - N > this.settings.numberOfConfirmations() + 1) {
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

  async queryTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult> {
    let results = []

    let startTimestamp = this.settings.windowStartTime(params.roundId);

    for (let table of this.transactionTable) {
      let query = this.dbService.connection.manager
        .createQueryBuilder(table, "transaction")
        .andWhere("transaction.timestamp >= :timestamp", { timestamp: startTimestamp })  // always query in the window.
        .andWhere("transaction.blockNumber <= :endBlock", { endBlock: params.endBlock });

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

    if (params.returnQueryBoundaryBlocks) {
      lowerQueryWindowBlock = await this.getFirstConfirmedBlockAfterTime(startTimestamp);
      let upperBlockResult = await this.queryBlock({
        endBlock: params.endBlock,
        blockNumber: params.endBlock,
        roundId: params.roundId,
        confirmed: true
      })
      upperQueryWindowBlock = upperBlockResult.result;
    }

    return {
      result: results as DBTransactionBase[],
      lowerQueryWindowBlock,
      upperQueryWindowBlock
    }
  }

  async queryBlock(params: BlockQueryParams): Promise<BlockQueryResult> {
    if (!params.blockNumber && !params.hash) {
      throw new Error("One of 'blockNumber' or 'hash' is a mandatory parameter");
    }
    let startTimestamp = this.settings.windowStartTime(params.roundId);
    let query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.timestamp >= :timestamp", { timestamp: startTimestamp });
    if (params.endBlock) {
      query = query.andWhere("block.blockNumber <= :endBlock", { endBlock: params.endBlock });
    }
    if (params.confirmed) {
      query = query.andWhere("block.confirmed = :confirmed", { confirmed: !!params.confirmed });
    }
    if (params.hash) {
      query.andWhere("block.blockHash = :hash", { hash: params.hash });
    } else if (params.blockNumber) {
      query.andWhere("block.blockNumber = :blockNumber", { blockNumber: params.blockNumber });
    }
    // console.log(query.getQuery())
    let result = await query.getOne();
    let lowerQueryWindowBlock: DBBlockBase;
    let upperQueryWindowBlock: DBBlockBase;

    if (params.returnQueryBoundaryBlocks) {
      lowerQueryWindowBlock = await this.getFirstConfirmedBlockAfterTime(startTimestamp);
      let upperBlockResult = await this.queryBlock({
        endBlock: params.blockNumber,
        blockNumber: params.blockNumber,
        roundId: params.roundId,
        confirmed: true
      })
      upperQueryWindowBlock = upperBlockResult.result;
    }
    return {
      result: result ? result as DBBlockBase : undefined,
      lowerQueryWindowBlock,
      upperQueryWindowBlock
    }
  }

  async getBlockByHash(hash: string) {
    let query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.blockHash = :hash", { hash: hash });
    let result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null;
  }

  private async upperBoundaryCheck(upperBoundProof: string, numberOfConfirmations: number, recheck: boolean): Promise<UpperBoundaryCheck> {
    let confBlock = await this.getBlockByHash(unPrefix0x(upperBoundProof));
    if (!confBlock) {
      if (!recheck) {
        return { status: "RECHECK" }
      }
      let upToDate = await this.isIndexerUpToDate();
      if (!upToDate) {
        return { status: "SYSTEM_FAILURE" }
      }
      return { status: "NO_BOUNDARY" }
    }

    let H = confBlock.blockNumber;
    let U = H - numberOfConfirmations + 1; // TODO !!!
    let N = await this.getLastConfirmedBlockNumber();
    if (N < U) {
      if (!recheck) {
        return { status: "RECHECK" }
      }
      return { status: "SYSTEM_FAILURE" }
    }
    return {
      status: "OK",
      U
    }
  }

  ////////////////////////////////////////////////////////////
  // Confirmed blocks queries
  ////////////////////////////////////////////////////////////

  public async getConfirmedBlock(params: ConfirmedBlockQueryRequest): Promise<ConfirmedBlockQueryResponse> {
    let { status, U } = await this.upperBoundaryCheck(params.upperBoundProof, params.numberOfConfirmations, params.type === "RECHECK");
    if (status != "OK") {
      return { status }
    }
    let blockQueryResult = await this.queryBlock({
      endBlock: U,
      blockNumber: params.blockNumber ? params.blockNumber : U,
      roundId: params.roundId,
      confirmed: true,
      returnQueryBoundaryBlocks: params.returnQueryBoundaryBlocks
    });
    return {
      status: blockQueryResult ? "OK" : "NOT_EXIST",
      block: blockQueryResult.result,
      lowerBoundaryBlock: blockQueryResult.lowerQueryWindowBlock,
      upperBoundaryBlock: blockQueryResult.upperQueryWindowBlock
    };
  }

  ////////////////////////////////////////////////////////////
  // Confirmed transaction queries
  ////////////////////////////////////////////////////////////

  public async getConfirmedTransaction(params: ConfirmedTransactionQueryRequest): Promise<ConfirmedTransactionQueryResponse> {
    let { status, U } = await this.upperBoundaryCheck(params.upperBoundProof, params.numberOfConfirmations, params.type === "RECHECK");
    if (status != "OK") {
      return { status }
    }
    let transactionsQueryResult = await this.queryTransactions({
      roundId: params.roundId,
      endBlock: U,
      transactionId: params.txId,
      returnQueryBoundaryBlocks: params.returnQueryBoundaryBlocks
    } as TransactionQueryParams);
    let transactions = transactionsQueryResult.result;
    return {
      status: transactions && transactions.length > 0 ? "OK" : "NOT_EXIST",
      transaction: transactions[0],
      lowerBoundaryBlock: transactionsQueryResult.lowerQueryWindowBlock,
      upperBoundaryBlock: transactionsQueryResult.upperQueryWindowBlock
    };
  }

  ////////////////////////////////////////////////////////////
  // Referenced transactions queries
  ////////////////////////////////////////////////////////////

  public async getReferencedTransactions(
    params: ReferencedTransactionsQueryRequest
  ): Promise<ReferencedTransactionsQueryResponse> {

    let { status, U } = await this.upperBoundaryCheck(params.upperBoundProof, params.numberOfConfirmations, params.type === "RECHECK");
    if (status != "OK") {
      return { status }
    }

    let firstOverflowBlock = await this.getFirstConfirmedOverflowBlock(params.deadlineBlockTimestamp, params.deadlineBlockNumber)
    if (!firstOverflowBlock || firstOverflowBlock.blockNumber > U) {
      return {
        status: "NO_OVERFLOW_BLOCK"
      }
    }

    let transactionsQueryResult = await this.queryTransactions({
      roundId: params.roundId,
      endBlock: firstOverflowBlock.blockNumber - 1,
      paymentReference: params.paymentReference,
      returnQueryBoundaryBlocks: true
    } as TransactionQueryParams);

    let transactions = transactionsQueryResult.result
    return {
      status: "OK",
      transactions,
      firstOverflowBlock,
      lowerBoundaryBlock: transactionsQueryResult.lowerQueryWindowBlock
    };
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
