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
  TransactionQueryResult,
  UpperBoundaryCheck,
} from "./indexed-query-manager-types";

// no supported chain produces more than 20 blocks per second 
const MAX_BLOCKCHAIN_PRODUCTION = 20;

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
  dbService: DatabaseService;
  client: MccClient;

  // debug helper
  debugLastConfirmedBlock: number | undefined = undefined;

  //Two transaction table entities `transaction0` and `transaction1`
  transactionTable = [undefined, undefined];

  // Block table entity
  blockTable;

  constructor(options: IndexedQueryManagerOptions) {
    // The database service can be passed through options or generated in place
    if (options.dbService) {
      this.dbService = options.dbService;
    } else {
      this.dbService = new DatabaseService(getGlobalLogger(), AttestationRoundManager.credentials.indexerDatabase, "indexer");
    }
    this.settings = options;
    this.prepareTables();
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
    if (this.debugLastConfirmedBlock === undefined || this.debugLastConfirmedBlock === null) {
      const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });
      if (res === undefined || res === null) {
        return 0;
      }
      return res.valueNumber;
    }
    return this.debugLastConfirmedBlock;
  }

  /**
   * Returns last block height (`T`) and the timestamp of the last sampling by indexer
   * @returns 
   */
  public async getLatestBlockTimestamp(): Promise<BlockHeightSample | null> {
    if (this.debugLastConfirmedBlock === undefined || this.debugLastConfirmedBlock === null) {
      const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainT() } });
      if (res === undefined || res === null) {
        return null;
      }
      return {
        height: res.valueNumber,
        timestamp: res.timestamp,
      };
    }
    return {
      height: this.debugLastConfirmedBlock + this.settings.numberOfConfirmations(),
      timestamp: getUnixEpochTimestamp(),
    };
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


  /**
   * Allows for artificial setup of the last known confirmed block. For debuging use.
   * @param blockNumber 
   * @returns 
   */
  public async setDebugLastConfirmedBlock(blockNumber: number | undefined): Promise<number | undefined> {
    if (blockNumber == null) {
      this.debugLastConfirmedBlock = undefined;
    } else if (blockNumber >= 0) {
      this.debugLastConfirmedBlock = blockNumber;
    } else {
      this.debugLastConfirmedBlock = undefined;
      const lastBlockNumber = await this.getLastConfirmedBlockNumber();
      this.debugLastConfirmedBlock = lastBlockNumber - blockNumber;
    }
    return this.debugLastConfirmedBlock;
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

    const startTimestamp = this.settings.windowStartTime(params.roundId);

    for (const table of this.transactionTable) {
      let query = this.dbService.connection.manager
        .createQueryBuilder(table, "transaction")
        .andWhere("transaction.timestamp >= :timestamp", { timestamp: startTimestamp }) // always query in the window.
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
      const upperBlockResult = await this.queryBlock({
        endBlock: params.endBlock,
        blockNumber: params.endBlock,
        roundId: params.roundId,
        confirmed: true,
      });
      upperQueryWindowBlock = upperBlockResult.result;
    }

    return {
      result: results as DBTransactionBase[],
      lowerQueryWindowBlock,
      upperQueryWindowBlock,
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
    const startTimestamp = this.settings.windowStartTime(params.roundId);
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

    const result = await query.getOne();
    let lowerQueryWindowBlock: DBBlockBase;
    let upperQueryWindowBlock: DBBlockBase;

    if (params.returnQueryBoundaryBlocks) {
      lowerQueryWindowBlock = await this.getFirstConfirmedBlockAfterTime(startTimestamp);
      const upperBlockResult = await this.queryBlock({
        endBlock: params.blockNumber,
        blockNumber: params.blockNumber,
        roundId: params.roundId,
        confirmed: true,
      });
      upperQueryWindowBlock = upperBlockResult.result;
    }
    return {
      result: result ? (result as DBBlockBase) : undefined,
      lowerQueryWindowBlock,
      upperQueryWindowBlock,
    };
  }

  /**
   * Gets a block for a given hash
   * @param hash 
   * @returns the block with given hash, if exists, `null` otherwise
   */
  async getBlockByHash(hash: string): Promise<DBBlockBase | null> {
    const query = this.dbService.connection.manager.createQueryBuilder(this.blockTable, "block").where("block.blockHash = :hash", { hash: hash });
    const result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null;
  }

  /**
   * Checks for existence of the block with hash `upperBoundProof`.
   * @param upperBoundProof hash of the upper bound block
   * @param numberOfConfirmations number of confirmations to consider
   * @param recheck phase of query (first query or recheck)
   * @returns search status, and if the upper bound proof block is found it returns the hight (`U`)
   * that is confirmed by the block, subject to `numberOfConfirmations`
   */
  private async upperBoundaryCheck(upperBoundProof: string, numberOfConfirmations: number, roundId: number, recheck: boolean): Promise<UpperBoundaryCheck> {
    const confBlock = await this.getBlockByHash(unPrefix0x(upperBoundProof));
    if (!confBlock) {
      if (!recheck) {
        return { status: "RECHECK" };
      }
      const upToDate = await this.isIndexerUpToDate();
      if (!upToDate) {
        return { status: "SYSTEM_FAILURE" };
      }
      return { status: "NO_BOUNDARY" };
    }

    // UBP block exists
    const valid = await this.validateForCutoffTime(confBlock, roundId);
    if (!valid) {
      const upToDate = await this.isIndexerUpToDate();
      if (!upToDate) {
        return { status: "SYSTEM_FAILURE" };
      }
      return { status: "NO_BOUNDARY" };
    }

    const H = confBlock.blockNumber;
    const U = H - numberOfConfirmations + 1;
    const N = await this.getLastConfirmedBlockNumber();
    if (N < U) {
      if (!recheck) {
        return { status: "RECHECK" };
      }
      return { status: "SYSTEM_FAILURE" };
    }
    return {
      status: "OK",
      U,
    };
  }

  /**
   * Checks whether lower boundary of query range within confirmed transactions is met.
   * For that at least one confirmed block with lower timestamp that lower boundary timestamp 
   * must exist in the database.
   * @param roundId 
   * @returns 
   */
  private async lowerBoundaryCheck(roundId: number): Promise<boolean> {
    // lower boundary timestamp
    const startTimestamp = this.settings.windowStartTime(roundId);
    return await this.hasIndexerConfirmedBlockStrictlyBeforeTime(startTimestamp);
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
    const { status, U } = await this.upperBoundaryCheck(params.upperBoundProof, params.numberOfConfirmations, params.roundId, params.type === "RECHECK");
    if (status != "OK") {
      return { status };
    }
    const blockQueryResult = await this.queryBlock({
      endBlock: U,
      blockNumber: params.blockNumber ? params.blockNumber : U,
      roundId: params.roundId,
      confirmed: true,
      returnQueryBoundaryBlocks: params.returnQueryBoundaryBlocks,
    });
    if (!blockQueryResult) {
      // check lower bound if block was not found. If block was found lower bound is not so important.
      const lowerCheck = await this.lowerBoundaryCheck(params.roundId);
      if (!lowerCheck) {
        return { status: "SYSTEM_FAILURE" };
      }
    }
    return {
      status: blockQueryResult ? "OK" : "NOT_EXIST",
      block: blockQueryResult.result,
      lowerBoundaryBlock: blockQueryResult.lowerQueryWindowBlock,
      upperBoundaryBlock: blockQueryResult.upperQueryWindowBlock,
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
    const { status, U } = await this.upperBoundaryCheck(params.upperBoundProof, params.numberOfConfirmations, params.roundId, params.type === "RECHECK");
    if (status != "OK") {
      return { status };
    }
    const lowerCheck = await this.lowerBoundaryCheck(params.roundId);
    if (!lowerCheck) {
      return { status: "SYSTEM_FAILURE" };
    }

    const transactionsQueryResult = await this.queryTransactions({
      roundId: params.roundId,
      endBlock: U,
      transactionId: params.txId,
      returnQueryBoundaryBlocks: params.returnQueryBoundaryBlocks,
    } as TransactionQueryParams);
    const transactions = transactionsQueryResult.result;

    return {
      status: transactions && transactions.length > 0 ? "OK" : "NOT_EXIST",
      transaction: transactions[0],
      lowerBoundaryBlock: transactionsQueryResult.lowerQueryWindowBlock,
      upperBoundaryBlock: transactionsQueryResult.upperQueryWindowBlock,
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
    const { status, U } = await this.upperBoundaryCheck(params.upperBoundProof, params.numberOfConfirmations, params.roundId, params.type === "RECHECK");
    if (status != "OK") {
      return { status };
    }

    const lowerCheck = await this.lowerBoundaryCheck(params.roundId);
    if (!lowerCheck) {
      return { status: "SYSTEM_FAILURE" };
    }

    const firstOverflowBlock = await this.getFirstConfirmedOverflowBlock(params.deadlineBlockTimestamp, params.deadlineBlockNumber);
    if (!firstOverflowBlock || firstOverflowBlock.blockNumber > U) {
      return {
        status: "NO_OVERFLOW_BLOCK",
      };
    }

    const transactionsQueryResult = await this.queryTransactions({
      roundId: params.roundId,
      endBlock: firstOverflowBlock.blockNumber - 1,
      paymentReference: params.paymentReference,
      returnQueryBoundaryBlocks: true,
    } as TransactionQueryParams);

    const transactions = transactionsQueryResult.result;
    return {
      status: "OK",
      transactions,
      firstOverflowBlock,
      lowerBoundaryBlock: transactionsQueryResult.lowerQueryWindowBlock,
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
    const query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp >= :timestamp", { timestamp: timestamp })
      .orderBy("block.timestamp", "ASC")
      .limit(MAX_BLOCKCHAIN_PRODUCTION);

    const results = (await query.getMany()) as DBBlockBase[];

    if (results.length === 0) return null;

    let result = results[0];
    for (const res of results) {
      if (res.blockNumber < result.blockNumber) {
        result = res;
      }
    }

    return result;
  }

  /**
   * Checks whether there is a confirmed block with timestamp strictly before given timestamp in the 
   * indexer database
   * @param timestamp 
   * @returns `true` if the block exists, `false` otherwise
   */
  public async hasIndexerConfirmedBlockStrictlyBeforeTime(timestamp: number): Promise<boolean> {
    const query = this.dbService.connection.manager
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
    const query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.confirmed = :confirmed", { confirmed: true })
      .andWhere("block.timestamp > :timestamp", { timestamp: timestamp })
      .andWhere("block.blockNumber > :blockNumber", { blockNumber: blockNumber })
      .orderBy("block.blockNumber", "ASC")
      .limit(1);

    const result = await query.getOne();
    if (result) {
      return result as DBBlockBase;
    }
    return null;
  }

  /**
   * Validates upper bound proof candidate `confBlock`. We assume confBlock is defined (not null).
   * If `confBlock.timestamp` is greater or equal then cut-off time for the round `roundId` then
   * it is always accepted. Otherwise `confBlock` has to be on one of the longest forks.
   * @param confBlock upper bound proof block to be validated
   * @param roundId round id for which validation is carried out
   * @returns true, if validation is successful
   */
  public async validateForCutoffTime(confBlock: DBBlockBase, roundId: number) {
    const cutoffTime = this.settings.UBPCutoffTime(roundId);
    if (confBlock.timestamp >= cutoffTime) {
      return true;
    }
    // if the block happens to be confirmed, we assume that it is on the longest/main fork.
    if (confBlock.confirmed) {
      return true;
    }
    // upper bound proof has to be on one of the longest chains (viewed locally)
    const query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.blockNumber = :blockNumber", { blockNumber: confBlock.blockNumber })
    const result = await query.getMany() as DBBlockBase[];

    for (const entity of result) {
      if (entity.confirmed) {
        // we are handling the case where block was confirmed while we were waiting for the query above
        if(entity.blockHash === confBlock.blockHash) {
          return true;
        }
        // some other block was confirmed on that height and data upperBoundProof is invalid
        return false;
      }
      // some other block on this height has more confirmations os the upperBoundProof is invalid.
      if (entity.numberOfConfirmations > confBlock.numberOfConfirmations) {
        return false;
      }
    }
    return true;
  }
}
