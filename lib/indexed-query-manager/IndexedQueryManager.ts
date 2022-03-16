import { MccClient } from "flare-mcc";
import { DBBlockBase } from "../entity/dbBlock";
import { DBState } from "../entity/dbState";
import { DBTransactionBase } from "../entity/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
import { DatabaseService } from "../utils/databaseService";
import { getGlobalLogger } from "../utils/logger";
import { getSourceName } from "../verification/attestation-types/attestation-types-helpers";
import { BlockHashQueryRequest, BlockHashQueryResponse, BlockNumberQueryRequest, BlockNumberQueryResponse, BlockQueryParams, IndexedQueryManagerOptions, ReferencedTransactionsQueryRequest, ReferencedTransactionsQueryResponse, TransactionExistenceQueryRequest, TransactionExistenceQueryResponse, TransactionQueryParams } from "./indexed-query-manager-types";


////////////////////////////////////////////////////////
/// IndexedQueryManger
////////////////////////////////////////////////////////

export class IndexedQueryManager {
  settings: IndexedQueryManagerOptions;
  dbService: DatabaseService;
  client: MccClient;

  transactionTable = [undefined, undefined];
  blockTable;

  constructor(client: MccClient, options: IndexedQueryManagerOptions) {
    this.dbService = new DatabaseService(getGlobalLogger());
    this.settings = options;
    this.client = client;
    this.prepareTables();
  }

  prepareTables() {
    let prepared = prepareIndexerTables(this.settings.chainType);
    this.transactionTable = prepared.transactionTable;
    this.blockTable = prepared.blockTable;
  }

  async queryTransactions(params: TransactionQueryParams): Promise<DBTransactionBase[]> {
    let results = []
    for (let table of this.transactionTable) {
      let query = this.dbService.connection.manager
        .createQueryBuilder(table, "transaction")
        .andWhere("transaction.blockNumber <= :blockNumber", { blockNumber: params.endBlock });

      // startBlock overrides default window
      if (params.startBlock) {
        query = query.andWhere("transaction.blockNumber >= :blockNumber", { blockNumber: params.startBlock });
      } else {
        let startTimestamp = this.settings.windowStartTime(params.roundId);
        query = query.andWhere("transaction.timestamp >= :timestamp", { timestamp: startTimestamp })
      }

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

    let result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null;
  }

  // Queries

  // deprecated atm
  public async getBlockByHash(params: BlockHashQueryRequest): Promise<BlockHashQueryResponse> {
    let block = await this.queryBlock({
      hash: params.hash,
      roundId: params.roundId,
    });
    return {
      status: block ? "OK" : "NOT_EXIST",
      block,
    };
  }

  private async getConfirmedBlockFirstCheck(params: BlockNumberQueryRequest): Promise<BlockNumberQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    if (params.blockNumber < N - 1) {
      let block = await this.queryBlock({
        blockNumber: params.blockNumber,
        roundId: params.roundId,
      });
      return {
        status: block ? "OK" : "NOT_EXIST",
        block: block,
      };
    } else if (params.blockNumber > N + 1) {
      return {
        status: "NOT_EXIST",
      };
    } else {
      // N - 1, N, N + 1
      return {
        status: "RECHECK",
      };
    }
  }

  private async getConfirmedBlockRecheck(params: BlockNumberQueryRequest): Promise<BlockNumberQueryResponse> {
    let block = await this.queryBlock({
      blockNumber: params.blockNumber,
      roundId: params.roundId,
    });
    let confirmationBlock = await this.queryBlock({
      hash: params.dataAvailabilityProof,
      roundId: params.roundId,
    } as BlockQueryParams);

    return {
      status: block && confirmationBlock && confirmationBlock.blockNumber - this.settings.noConfirmations === block.blockNumber ? "OK" : "NOT_EXIST",
      block: block
    };
  }

  public async getConfirmedBlock(params: BlockNumberQueryRequest): Promise<BlockNumberQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.getConfirmedBlockFirstCheck(params);
    }
    return this.getConfirmedBlockRecheck(params);
  }

  // todo: this.indexer.lastConfimedBlockNumber must be from DB query
  getChainN() {
    return getSourceName(this.settings.chainType) + "_N";
  }

  public async getLastConfirmedBlockNumber(): Promise<number> {
    const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });

    if (res === undefined) return 0;

    return res.valueNumber;
  }

  private async getConfirmedTransactionFirstCheck(params: TransactionExistenceQueryRequest): Promise<TransactionExistenceQueryResponse> {
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
    } else if (params.blockNumber > N + 1) {
      return {
        status: "NOT_EXIST",
      };
    } else {
      // N - 1, N, N + 1
      return {
        status: "RECHECK",
      };
    }
  }

  private async getConfirmedTransactionRecheck(params: TransactionExistenceQueryRequest): Promise<TransactionExistenceQueryResponse> {
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
      status: transactions && transactions.length === 1 && confirmationBlock && confirmationBlock.blockNumber - this.settings.noConfirmations === transactions[0].blockNumber ? "OK" : "NOT_EXIST",
      transaction: transactions[0],
    };
  }

  public async getConfirmedTransaction(params: TransactionExistenceQueryRequest): Promise<TransactionExistenceQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.getConfirmedTransactionFirstCheck(params);
    }
    return this.getConfirmedTransactionRecheck(params);
  }

  public async getReferencedTransactionsFirstCheck(
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
        return {
          status: "NO_OVERFLOW_BLOCK",
        };
      }
      let transactions = await this.queryTransactions({
        roundId: params.roundId,
        startBlock: params.startBlockNumber,
        endBlock: overflowBlock.blockNumber - 1,
        paymentReference: params.paymentReference,
      } as TransactionQueryParams);
      return {
        status: "OK",
        transactions,
        block: overflowBlock
      };
    } else if (params.overflowBlockNumber > N + 1) {
      return {
        status: "NO_OVERFLOW_BLOCK",    // Status is still OK, but nothing was found.
      };
    } else {
      // N - 1, N, N + 1
      return {
        status: "RECHECK",
      };
    }
  }

  public async getReferencedTransactionsRecheck(
    params: ReferencedTransactionsQueryRequest
  ): Promise<ReferencedTransactionsQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    // let overflowBlock = await this.getFirstConfirmedOverflowBlock(params.endTime, params.overflowBlockNumber);
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
      startBlock: params.startBlockNumber,
      endBlock: overflowBlock.blockNumber - 1,
      paymentReference: params.paymentReference,
    } as TransactionQueryParams);
    let confirmationBlock = await this.queryBlock({
      hash: params.dataAvailabilityProof,
      roundId: params.roundId,
    } as BlockQueryParams);
    return {
      status: confirmationBlock && confirmationBlock.blockNumber - this.settings.noConfirmations === overflowBlock.blockNumber ? "OK" : "NO_OVERFLOW_BLOCK",
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
