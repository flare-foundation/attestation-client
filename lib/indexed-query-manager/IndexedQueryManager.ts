import { ChainType, MccClient } from "flare-mcc";
import { DBBlockBase } from "../entity/dbBlock";
import { DBState } from "../entity/dbState";
import { DBTransactionBase } from "../entity/dbTransaction";
import { prepareIndexerTables } from "../indexer/indexer-utils";
import { DatabaseService } from "../utils/databaseService";
import { getGlobalLogger } from "../utils/logger";
import { getSourceName } from "../verification/attestation-types/attestation-types-helpers";
export interface IndexedQueryManagerOptions {
  chainType: ChainType;
  // number of confirmations required
  noConfirmations: number;
  // return windows start time from current epochId
  windowStartTime: (epochId: number) => number;
}

////////////////////////////////////////////////////////
/// General query params
////////////////////////////////////////////////////////

export interface TransactionQueryParams {
  roundId: number;
  lastConfirmedBlock: number;
  transactionId?: string;
  paymentReference?: string;
}

export interface BlockQueryParams {
  hash?: string;
  blockNumber?: number;
  roundId: number;
}

export type IndexerQueryType = "FIRST_CHECK" | "RECHECK";

////////////////////////////////////////////////////////
/// Specific query requests and responses
////////////////////////////////////////////////////////

export interface BlockHashQueryRequest {
  hash: string;
  roundId: number;
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface BlockHashQueryResponse {
  status: "OK" | "NOT_EXIST";
  block?: DBBlockBase;
}

export interface BlockNumberQueryRequest {
  blockNumber: number;
  roundId: number;
  dataAvailability: string; // hash of confirmation block(used for syncing of edge - cases)
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface BlockNumberQueryResponse {
  status: "OK" | "RECHECK" | "NOT_EXIST";
  block?: DBBlockBase;
}

export interface TransactionExistenceQueryRequest {
  txId: string; // transaction id
  blockNumber: number; // block number for the transaction with `txId
  dataAvailability: string; // hash of confirmation block(used for syncing of edge - cases)
  roundId: number; // voting round id for check
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface TransactionExistenceQueryResponse {
  status: "OK" | "RECHECK" | "NOT_EXIST";
  transaction?: DBTransactionBase;
}

export interface ReferencedTransactionNonExistenceQueryRequest {
  payementReference: string; // payment reference
  blockNumber: number; // last block number to check (defines upper bound of search interval)
  dataAvailability: string; // hash of confirmation block(used for blockNumber
  roundId: number; // voting round id for check
  type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
}

export interface ReferencedTransactionNonExistenceQueryResponse {
  status: "OK" | "RECHECK" | "NO_CONFIRMATION_BLOCK";
  transactions?: DBTransactionBase[];
  block?: DBBlockBase;
}

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
    let startTimestamp = this.settings.windowStartTime(params.roundId);
    //  let query0 = this.dbService.connection.manager
    //    .createQueryBuilder(this.transactionTable[0], "transaction")
    //    .andWhere("transaction.timestamp >= :timestamp", { timestamp: startTimestamp })
    //    .andWhere("transaction.blockNumber <= :blockNumber", { blockNumber: params.lastConfirmedBlock });
    //  if (params.paymentReference) {
    //    query0 = query0.andWhere("transaction.paymentReference=:ref", { ref: params.paymentReference });
    //  }
    //  if (params.transactionId) {
    //    query0 = query0.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
    //  }

    //  const results0 = await query0.getRawMany();

    //  let query1 = this.dbService.connection.manager
    //    .createQueryBuilder(this.transactionTable[1], "transaction")
    //    .where("transaction.timestamp >= :timestamp", { timestamp: startTimestamp })
    //    .andWhere("transaction.blockNumber <= :blockNumber", { blockNumber: params.lastConfirmedBlock });
    //  if (params.paymentReference) {
    //    query1 = query1.andWhere("transaction.paymentReference=:ref", { ref: params.paymentReference });
    //  }
    //  if (params.transactionId) {
    //    query1 = query1.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
    //  }

    //  const results1 = await query1.getMany();
    //  return results0.concat(results1);

    let results = []
    for (let table of this.transactionTable) {
      let query = this.dbService.connection.manager
        .createQueryBuilder(table, "transaction")
        .andWhere("transaction.timestamp >= :timestamp", { timestamp: startTimestamp })
        .andWhere("transaction.blockNumber <= :blockNumber", { blockNumber: params.lastConfirmedBlock });
      if (params.paymentReference) {
        query = query.andWhere("transaction.paymentReference=:ref", { ref: params.paymentReference });
      }
      if (params.transactionId) {
        query = query.andWhere("transaction.transactionId = :txId", { txId: params.transactionId });
      }

      results = results.concat(await query.getRawMany());
    }
    return results
  }

  async queryBlock(params: BlockQueryParams): Promise<DBBlockBase | null> {
    let startTimestamp = this.settings.windowStartTime(params.roundId);
    let query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.timestamp >= :timestamp", { timestamp: startTimestamp });
    if (params.hash) {
      query.andWhere("block.blockHash = :hash", { hash: params.hash });
    } else if (params.blockNumber) {
      query.andWhere("block.blockNumber = :blockNumber", { blockNumber: params.blockNumber });
    }

    let result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    // todo: fix
    //return this.indexer.getBlockByHash(params.hash);
    return null;
  }

  // Queries

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
      hash: params.dataAvailability,
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

  private async checkTransactionExistenceFirstCheck(params: TransactionExistenceQueryRequest): Promise<TransactionExistenceQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    if (params.blockNumber < N - 1) {
      let transactions = await this.queryTransactions({
        roundId: params.roundId,
        lastConfirmedBlock: N,
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

  private async checkTransactionExistenceRecheck(params: TransactionExistenceQueryRequest): Promise<TransactionExistenceQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    let transactions = await this.queryTransactions({
      roundId: params.roundId,
      lastConfirmedBlock: N,
      transactionId: params.txId,
    } as TransactionQueryParams);
    let confirmationBlock = await this.queryBlock({
      hash: params.dataAvailability,
      roundId: params.roundId,
    } as BlockQueryParams);
    return {
      status: transactions && transactions.length === 1 && confirmationBlock && confirmationBlock.blockNumber - this.settings.noConfirmations === transactions[0].blockNumber ? "OK" : "NOT_EXIST",
      transaction: transactions[0],
    };
  }

  public async checkTransactionExistence(params: TransactionExistenceQueryRequest): Promise<TransactionExistenceQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.checkTransactionExistenceFirstCheck(params);
    }
    return this.checkTransactionExistenceRecheck(params);
  }

  public async checkReferencedTransactionNonExistenceFirstCheck(
    params: ReferencedTransactionNonExistenceQueryRequest
  ): Promise<ReferencedTransactionNonExistenceQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    if (params.blockNumber < N - 1) {
      let transactions = await this.queryTransactions({
        roundId: params.roundId,
        lastConfirmedBlock: N,
        paymentReference: params.payementReference,
      } as TransactionQueryParams);
      return {
        status: "OK",
        transactions,
      };
    } else if (params.blockNumber > N + 1) {
      return {
        status: "OK",
        transactions: [],
      };
    } else {
      // N - 1, N, N + 1
      return {
        status: "RECHECK",
      };
    }
  }

  public async checkReferencedTransactionNonExistenceRecheck(
    params: ReferencedTransactionNonExistenceQueryRequest
  ): Promise<ReferencedTransactionNonExistenceQueryResponse> {
    let N = await this.getLastConfirmedBlockNumber();
    let transactions = await this.queryTransactions({
      roundId: params.roundId,
      lastConfirmedBlock: N,
      paymentReference: params.payementReference,
    } as TransactionQueryParams);
    let block = await this.queryBlock({
      hash: params.dataAvailability,
      roundId: params.roundId,
    } as BlockQueryParams);
    return {
      status: block ? "OK" : "NO_CONFIRMATION_BLOCK",
      transactions,
      block,
    };
  }

  public async checkReferencedTransactionNonExistence(
    params: ReferencedTransactionNonExistenceQueryRequest
  ): Promise<ReferencedTransactionNonExistenceQueryResponse> {
    if (params.type === "FIRST_CHECK") {
      return this.checkReferencedTransactionNonExistenceFirstCheck(params);
    }
    return this.checkReferencedTransactionNonExistenceRecheck(params);
  }


  ////////////////////////////////////////////////////////////
  // Test functions 
  ////////////////////////////////////////////////////////////

  public async getRandomTransaction() {
    let result: DBTransactionBase | undefined;
    while(!result) {
      let tableId = Math.round(Math.random());
      let table = this.transactionTable[tableId];
      const query = this.dbService.connection.manager.createQueryBuilder(table, "transaction")
      .select(["MIN(transaction.id) AS min", "MAX(transaction.id) as max"])
      // query.addSelect("MAX(quotation.quotationVersion)", "max");
      const {min, max} = await query.getRawOne();  
      console.log(min, max);
      let randN = Math.floor(Math.random()*(max - min + 1)) + min;
      console.log(randN);
      result = await this.dbService.connection.manager.findOne(table, { where: { id: randN } }) as DBTransactionBase;  
    }
    return result;  
  }

  public async getRandomConfirmedBlock() {    
    const query = this.dbService.connection.manager.createQueryBuilder(this.blockTable, "block")
    .select(["MIN(block.blockNumber) AS min", "MAX(transaction.id) as max"])

  }
}
