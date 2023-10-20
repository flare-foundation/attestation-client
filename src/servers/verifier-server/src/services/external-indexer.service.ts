import { unPrefix0x } from "@flarenetwork/mcc";
import { Inject, Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager, IsNull, SelectQueryBuilder } from "typeorm";
import { DBBlockBase, DBDogeIndexerBlock, IDEDogeIndexerBlock } from "../../../../entity/indexer/dbBlock";
import { DBState, ITipSyncState, TipSyncState } from "../../../../entity/indexer/dbState";
import { ExternalDBVerifierConfigurationService, VerifierConfigurationService } from "./verifier-configuration.service";
import { ApiDBTransaction } from "../dtos/indexer/ApiDbTransaction";
import { BlockRange } from "../dtos/indexer/BlockRange.dto";
import { IIndexerEngineService, getTransactionsWithinBlockRangeProps } from "./indexer-engine.service";
import { DBDogeTransaction, IDBDogeTransaction } from "../../../../entity/indexer/dbTransaction";
import { BlockResult } from "../../../../indexed-query-manager/indexed-query-manager-types";
import { ApiDBBlock } from "../dtos/indexer/ApiDbBlock";

@Injectable()
export class ExternalIndexerEngineService extends IIndexerEngineService {
  // External doge specific tables
  private transactionTable: IDBDogeTransaction;
  private blockTable: IDEDogeIndexerBlock;
  private tipState: ITipSyncState;

  constructor(
    @Inject("VERIFIER_CONFIG") private configService: ExternalDBVerifierConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) {
    super();
    this.transactionTable = DBDogeTransaction;
    this.blockTable = DBDogeIndexerBlock;
    this.tipState = TipSyncState;
  }

  private joinTransactionQuery(query: SelectQueryBuilder<DBDogeTransaction>) {
    return query
      .leftJoinAndSelect("transaction.transactionoutput_set", "transactionOutput")
      .leftJoinAndSelect("transaction.transactioninputcoinbase_set", "transactionInputCoinbase")
      .leftJoinAndSelect("transaction.transactioninput_set", "transactionInput");
  }

  /**
   * Gets the state entries from the indexer database.
   * @returns
   */
  public async getStateSetting() {
    throw new Error("Not implemented");
  }

  /**
   * Gets the range of available confirmed blocks in the indexer database.
   * @returns
   */
  public async getBlockRange(): Promise<BlockRange | null> {
    const query = this.manager
      .createQueryBuilder(this.transactionTable, "transaction")
      .select("MAX(transaction.blockNumber)", "max")
      .addSelect("MIN(transaction.blockNumber)", "min");
    const res = await query.getRawOne();
    if (res) {
      return {
        first: res.min,
        last: res.max,
      };
    }
    return null;
  }

  /**
   * Gets the confirmed transaction from the indexer database for a given transaction id (hash).
   * @param txHash
   * @returns
   */
  public async getTransaction(txHash: string): Promise<ApiDBTransaction> | null {
    const query = this.joinTransactionQuery(
      this.manager.createQueryBuilder(this.transactionTable, "transaction").andWhere("transaction.transactionId = :txHash", { txHash })
    );
    const res = await query.getOne();
    if (res === null) {
      return null;
    }
    return res.toApiDBTransaction(true);
  }

  /**
   * Gets a block header data from the indexer database for a given block hash.
   * @param blockHash
   * @returns
   */
  public async getBlock(blockHash: string): Promise<ApiDBBlock | null> {
    const query = this.manager.createQueryBuilder(this.blockTable, "block").andWhere("block.blockHash = :blockHash", { blockHash });
    const res = await query.getOne();
    if (res === null) {
      return null;
    }
    return res.toApiDBBlock();
  }

  /**
   * Gets a block in the indexer database with the given block number. Note that some chains may have blocks in multiple forks on the same height.
   * @param blockNumber
   * @returns
   */
  public async confirmedBlockAt(blockNumber: number): Promise<ApiDBBlock | null> {
    const query = this.manager.createQueryBuilder(this.blockTable, "block").andWhere("block.blockNumber = :blockNumber", { blockNumber });
    const res = await query.getOne();
    if (res === null) {
      return null;
    }
    return res.toApiDBBlock();
  }

  /**
   * Get the height of the last observed block in the indexer database.
   */
  public async getBlockHeight(): Promise<number> | null {
    const query = this.manager.createQueryBuilder(this.blockTable, "block").orderBy("block.blockNumber", "DESC").limit(1);
    const res = await query.getOne();
    if (res === null) {
      return null;
    }
    return res.blockNumber;
  }

  /**
   * Get the block header data of the confirmed transaction in the database
   * for the given transaction id.
   * @param txHash
   * @returns
   */
  public async getTransactionBlock(txHash: string): Promise<ApiDBBlock> | null {
    const tx = await this.getTransaction(txHash);
    if (tx) {
      const block = await this.confirmedBlockAt(tx.blockNumber);
      if (block === null) {
        return null;
      }
      return block;
    }
    return null;
  }

  /**
   * Gets a confirmed transaction from the indexer database in the given block number range.
   * @param from
   * @param to
   * @returns
   */
  public async getTransactionsWithinBlockRange({
    from,
    to,
    paymentReference,
    limit,
    offset,
    returnResponse,
  }: getTransactionsWithinBlockRangeProps): Promise<ApiDBTransaction[]> {
    if (paymentReference) {
      if (!/^0x[0-9a-f]{64}$/i.test(paymentReference)) {
        throw new Error("Invalid payment reference");
      }
    }

    let theLimit = limit ?? this.configService.config.indexerServerPageLimit;
    theLimit = Math.min(theLimit, this.configService.config.indexerServerPageLimit);
    let theOffset = offset ?? 0;

    let query = this.manager.createQueryBuilder(this.transactionTable, "transaction");
    if (from !== undefined) {
      query = query.andWhere("transaction.blockNumber >= :from", { from });
    }
    if (to !== undefined) {
      query = query.andWhere("transaction.blockNumber <= :to", { to });
    }
    if (paymentReference) {
      query = query.andWhere("transaction.paymentReference = :reference", { reference: unPrefix0x(paymentReference) });
    }
    query = query.orderBy("transaction.blockNumber", "ASC").addOrderBy("transaction.transactionId", "ASC").limit(theLimit).offset(theOffset);
    if (returnResponse) {
      query = this.joinTransactionQuery(query);
    }
    const results = await query.getMany();
    return results.map((res) => {
      return res.toApiDBTransaction(returnResponse);
    });
  }
}
