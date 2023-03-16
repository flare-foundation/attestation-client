import { unPrefix0x } from "@flarenetwork/mcc";
import { Inject, Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { DBBlockBase } from "../../../../entity/indexer/dbBlock";
import { DBState } from "../../../../entity/indexer/dbState";
import { DBTransactionBase } from "../../../../entity/indexer/dbTransaction";
import { BlockRange } from "../dtos/BlockRange.dto";
import { VerifierConfigurationService } from "./verifier-configuration.service";

@Injectable()
export class IndexerEngineService {
  constructor(
    @Inject("VERIFIER_CONFIG") private configService: VerifierConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) { }

  /**
   * Gets the state entries from the indexer database.
   * @returns
   */
  public async getStateSetting() {
    let stateQuery = this.manager.createQueryBuilder(DBState, "state");
    let res = await stateQuery.getMany();
    return res;
  }

  /**
   * Gets the range of available confirmed blocks in the indexer database.
   * @returns
   */
  public async getBlockRange(): Promise<BlockRange | null> {
    let results: any[] = [];
    for (let table of this.configService.transactionTable) {
      let maxQuery = this.manager
        .createQueryBuilder(table as any, "transaction")
        .select("MAX(transaction.blockNumber)", "max")
        .addSelect("MIN(transaction.blockNumber)", "min");
      let res = await maxQuery.getRawOne();
      if (res) {
        results.push(res);
      }
    }
    if (results.length) {
      return {
        first: Math.min(...results.map((r) => r.min as number)),
        last: Math.max(...results.map((r) => r.max as number)),
      };
    }
    return null;
  }

  /**
   * Gets the confirmed transaction from the indexer database for a given transaction id (hash).
   * @param txHash
   * @returns
   */
  public async getTransaction(txHash: string): Promise<DBTransactionBase> | null {
    let results: any[] = [];
    for (let table of this.configService.transactionTable) {
      let query = this.manager.createQueryBuilder(table as any, "transaction").andWhere("transaction.transactionId = :txHash", { txHash });
      results = results.concat(await query.getOne());
    }
    for (let res of results) {
      if (res) {
        if (res.response) {
          res.response = JSON.parse(res.response);
        }
        return res as DBTransactionBase;
      }
    }
    return null;
  }

  /**
   * Gets a block header data from the indexer database for a given block hash.
   * @param blockHash
   * @returns
   */
  public async getBlock(blockHash: string): Promise<DBBlockBase> {
    let query = this.manager.createQueryBuilder(this.configService.blockTable as any, "block").andWhere("block.blockHash = :blockHash", { blockHash });
    let result = (await query.getOne()) as DBBlockBase;
    return result;
  }

  /**
   * Gets a block in the indexer database with the given block number. Note that some chains may have blocks in multiple forks on the same height.
   * @param blockNumber
   * @returns
   */
  public async confirmedBlockAt(blockNumber: number): Promise<DBBlockBase> {
    let query = this.manager.createQueryBuilder(this.configService.blockTable as any, "block")
      .andWhere("block.blockNumber = :blockNumber", { blockNumber })
      .andWhere("block.confirmed = :confirmed", { confirmed: true });
    let result = (await query.getOne()) as DBBlockBase;
    return result;
  }

  /**
   * Get the height of the last observed block in the indexer database.
   */
  public async getBlockHeight(): Promise<number> | null {
    let query = this.manager
      .createQueryBuilder(this.configService.blockTable as any, "block")
      .orderBy("block.blockNumber", "DESC")
      .limit(1);
    let result = (await query.getOne()) as DBBlockBase;
    if (result) {
      return result.blockNumber;
    }
    return null;
  }

  /**
   * Get the block header data of the confirmed transaction in the database
   * for the given transaction id.
   * @param txHash
   * @returns
   */
  public async getTransactionBlock(txHash: string): Promise<DBBlockBase> | null {
    const tx = await this.getTransaction(txHash);
    if (tx) {
      const block = await this.confirmedBlockAt(tx.blockNumber);
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
  public async getTransactionsWithinBlockRange(from?: number, to?: number, paymentReference?: string, limit?: number, offset?: number): Promise<DBTransactionBase[]> {
    if (paymentReference) {
      if (! /^0x[0-9a-f]{64}$/i.test(paymentReference)) {
        throw new Error("Invalid payment reference")
      }
    }
    let theLimit = limit ?? this.configService.config.indexerServerPageLimit;
    theLimit = Math.min(theLimit, this.configService.config.indexerServerPageLimit);
    let theOffset = offset ?? 0;
    let results: any[] = [];
    let stats = [];
    let index = 0;

    // Check the sizes of results in both tables
    for (let table of this.configService.transactionTable) {
      let countQuery = this.manager
        .createQueryBuilder(table as any, "transaction");
      if (from !== undefined) {
        countQuery = countQuery.andWhere("transaction.blockNumber >= :from", { from });
      }
      if (to !== undefined) {
        countQuery = countQuery.andWhere("transaction.blockNumber < :to", { to });
      }
      if (paymentReference) {
        countQuery = countQuery.andWhere("transaction.paymentReference = :reference", { reference: unPrefix0x(paymentReference) });
      }

      countQuery = countQuery
        .select("COUNT(id)", "cnt")
        .addSelect("MIN(transaction.blockNumber)", "min");
      let stat = await countQuery.getRawOne();
      if (stat.cnt) {
        stat.index = index;
        stats.push(stat);
      }
      index++;
    }

    // order the tables by block numbers
    if (stats.length > 1 && stats[0].min > stats[1].min) {
      stats = [stats[1], stats[0]];
    }
    // Make an offset query in the first table if needed
    if (stats[0] && theOffset < stats[0].cnt) {
      let query = this.manager
        .createQueryBuilder(this.configService.transactionTable[stats[0].index] as any, "transaction");
      if (from !== undefined) {
        query = query.andWhere("transaction.blockNumber >= :from", { from });
      }
      if (to !== undefined) {
        query = query.andWhere("transaction.blockNumber < :to", { to });
      }
      if (paymentReference) {
        query = query.andWhere("transaction.paymentReference = :reference", { reference: unPrefix0x(paymentReference) });
      }
      query = query
        .orderBy("transaction.blockNumber", "ASC")
        .addOrderBy("transaction.transactionId", "ASC")
        .limit(theLimit)
        .offset(theOffset);
      results = results.concat(await query.getMany());
    }
    // Make an offset query in the second table if needed
    if (stats[1] && stats[1].cnt > 0 && theOffset >= stats[0].cnt) {
      theLimit = results.length > 0 ? theLimit - results.length : theLimit;
      theOffset = results.length > 0 ? 0 : theOffset - stats[0].cnt;
      let query = this.manager
        .createQueryBuilder(this.configService.transactionTable[stats[1].index] as any, "transaction");
      if (from !== undefined) {
        query = query.andWhere("transaction.blockNumber >= :from", { from });
      }
      if (to !== undefined) {
        query = query.andWhere("transaction.blockNumber < :to", { to });
      }
      if (paymentReference) {
        query = query.andWhere("transaction.paymentReference = :reference", { reference: unPrefix0x(paymentReference) });
      }
      query = query
        .orderBy("transaction.blockNumber", "ASC")
        .addOrderBy("transaction.transactionId", "ASC")
        .limit(theLimit)
        .offset(theOffset);
      results = results.concat(await query.getMany());
    }

    return results.map((res) => {
      if (res.response) {
        res.response = JSON.parse(res.response);
      }
      return res;
    }) as DBTransactionBase[];
  }

}
