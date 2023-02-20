import { Inject, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DBBlockBase } from '../../../../entity/indexer/dbBlock';
import { DBState } from '../../../../entity/indexer/dbState';
import { DBTransactionBase } from '../../../../entity/indexer/dbTransaction';
import { BlockRange } from '../dtos/BlockRange.dto';
import { VerifierConfigurationService } from './verifier-configuration.service';

@Injectable()
export class IndexerEngineService {

  constructor(
    @Inject("VERIFIER_CONFIG") private configService: VerifierConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) { }


  public async getStateSetting() {
    let stateQuery = this.manager
      .createQueryBuilder(DBState, "state");
    let res = await stateQuery.getMany();
    return res;
  }

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
        first: Math.min(...results.map(r => r.min as number)),
        last: Math.max(...results.map(r => r.max as number)),
      }
    }
    return null;
  }

  public async getBlockTransactions(blockNumber: number): Promise<DBTransactionBase[]> {
    let results: any[] = [];
    for (let table of this.configService.transactionTable) {
      let query = this.manager
        .createQueryBuilder(table as any, "transaction")
        .andWhere("transaction.blockNumber = :blockNumber", { blockNumber });
      results = results.concat(await query.getMany());
    }
    return results.map(res => {
      if (res.response) {
        res.response = JSON.parse(res.response);
      }
      return res;
    }) as DBTransactionBase[];
  }

  public async getTransaction(txHash: string): Promise<DBTransactionBase> | null {
    let results: any[] = [];
    for (let table of this.configService.transactionTable) {
      let query = this.manager
        .createQueryBuilder(table as any, "transaction")
        .andWhere("transaction.transactionId = :txHash", { txHash });
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

  public async getBlock(blockHash: string): Promise<DBBlockBase> {
    let query = this.manager
      .createQueryBuilder(this.configService.blockTable as any, "block")
      .andWhere("block.blockHash = :blockHash", { blockHash });
    let result = await query.getOne() as DBBlockBase;
    return result;
  }

  public async getBlockAt(blockNumber: number): Promise<DBBlockBase> {
    let query = this.manager
      .createQueryBuilder(this.configService.blockTable as any, "block")
      .andWhere("block.blockNumber = :blockNumber", { blockNumber });
    let result = await query.getOne() as DBBlockBase;
    return result;
  }

  public async getBlockHeight(): Promise<number> | null {
    let query = this.manager
      .createQueryBuilder(this.configService.blockTable as any, "block")
      .orderBy("block.blockNumber", "DESC")
      .limit(1);
    let result = await query.getOne() as DBBlockBase;
    if (result) {
      return result.blockNumber;
    }
    return null;
  }

  public async getTransactionBlock(txHash: string): Promise<DBBlockBase> | null {
    const tx = await this.getTransaction(txHash);
    if (tx) {
        const block = await this.getBlockAt(tx.blockNumber);
        return block;
      }
      return null;
    }

    public async getTransactionsWithPaymentReference(reference: string): Promise<DBTransactionBase[]> {
      let results: any[] = [];
      for (let table of this.configService.transactionTable) {
        let query = this.manager
          .createQueryBuilder(table as any, "transaction")
          .andWhere("transaction.paymentReference = :reference", { reference });
        results = results.concat(await query.getMany());
      }
      return results.map(res => {
        if (res.response) {
          res.response = JSON.parse(res.response);
        }
        return res;
      }) as DBTransactionBase[];
    }


    public async transactionsWithinTimestampRange(from: number, to: number): Promise<DBTransactionBase[]> {
      let results: any[] = [];
      for (let table of this.configService.transactionTable) {
        let query = this.manager
          .createQueryBuilder(table as any, "transaction")
          .andWhere("transaction.timestamp >= :from", { from })
          .andWhere("transaction.timestamp < :to", { to });
        results = results.concat(await query.getMany());
      }
      return results.map(res => {
        if (res.response) {
          res.response = JSON.parse(res.response);
        }
        return res;
      }) as DBTransactionBase[];
    }

    public async blocksWithinTimestampRange(from: number, to: number): Promise<DBBlockBase[]> {
      let query = this.manager
        .createQueryBuilder(this.configService.blockTable as any, "block")
        .andWhere("block.timestamp >= :from", { from })
        .andWhere("block.timestamp < :to", { to });
      let result = await query.getMany() as DBBlockBase[];
      return result;
    }
    
  }
