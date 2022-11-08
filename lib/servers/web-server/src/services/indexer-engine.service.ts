import { ServerConfigurationService } from '@atc/common';
import { ChainType, MCC, toCamelCase } from '@flarenetwork/mcc';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DBBlockBase } from '../../../../entity/indexer/dbBlock';
import { DBState } from '../../../../entity/indexer/dbState';
import { DBTransactionBase } from '../../../../entity/indexer/dbTransaction';
import { prepareIndexerTables } from '../../../../indexer/indexer-utils';
import { BlockRange } from '../dtos/BlockRange.dto';

@Injectable()
export class IndexerEngineService {

  constructor(
    private configService: ServerConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) { }


  public async getStateSetting() {
    let stateQuery = this.manager
      .createQueryBuilder(DBState, "state");
    let res = await stateQuery.getMany();
    return res;
  }

  public async getBlockRange(chain: string): Promise<BlockRange | null> {
    let chainType = MCC.getChainType(chain);
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`);
    }
    let results: any[] = [];
    let { transactionTable } = prepareIndexerTables(chainType);
    for (let table of transactionTable) {
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

  public async getBlockTransactions(chain: string, blockNumber: number): Promise<DBTransactionBase[]> {
    let chainType = MCC.getChainType(chain);
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`);
    }
    let results: any[] = [];
    let { transactionTable } = prepareIndexerTables(chainType);
    for (let table of transactionTable) {
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

  public async getTransaction(chain: string, txHash: string): Promise<DBTransactionBase> | null {
    let chainType = MCC.getChainType(chain);
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`);
    }
    let results: any[] = [];
    let { transactionTable } = prepareIndexerTables(chainType);
    for (let table of transactionTable) {
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

  public async getBlock(chain: string, blockHash: string): Promise<DBBlockBase> {
    let chainType = MCC.getChainType(chain);
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`);
    }
    let { blockTable } = prepareIndexerTables(chainType);
    let query = this.manager
      .createQueryBuilder(blockTable as any, "block")
      .andWhere("block.blockHash = :blockHash", { blockHash });
    let result = await query.getOne() as DBBlockBase;
    return result;
  }

  public async getBlockAt(chain: string, blockNumber: number): Promise<DBBlockBase> {
    let chainType = MCC.getChainType(chain);
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`);
    }
    let { blockTable } = prepareIndexerTables(chainType);
    let query = this.manager
      .createQueryBuilder(blockTable as any, "block")
      .andWhere("block.blockNumber = :blockNumber", { blockNumber });
    let result = await query.getOne() as DBBlockBase;
    return result;
  }

  public async getBlockHeight(chain: string): Promise<number> | null {
    let chainType = MCC.getChainType(chain);
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`);
    }
    let { blockTable } = prepareIndexerTables(chainType);
    let query = this.manager
      .createQueryBuilder(blockTable as any, "block")
      .orderBy("block.blockNumber", "DESC")
      .limit(1);
    let result = await query.getOne() as DBBlockBase;
    if (result) {
      return result.blockNumber;
    }
    return null;
  }

  public async getTransactionBlock(chain: string, txHash: string): Promise<DBBlockBase> | null {
    let chainType = MCC.getChainType(chain)
    if (chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`)
    }
    const tx = await this.getTransaction(chain, txHash);
    if (tx) {
        const block = await this.getBlockAt(chain, tx.blockNumber);
        return block;
      }
      return null;
    }

    public async getTransactionsWithPaymentReference(chain: string, reference: string): Promise<DBTransactionBase[]> {
      let chainType = MCC.getChainType(chain);
      if (chainType === ChainType.invalid) {
        throw new Error(`Unsupported chain '${chain}'`);
      }
      let results: any[] = [];
      let { transactionTable } = prepareIndexerTables(chainType);
      for (let table of transactionTable) {
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


    public async transactionsWithinTimestampRange(chain: string, from: number, to: number): Promise<DBTransactionBase[]> {
      let chainType = MCC.getChainType(chain);
      if (chainType === ChainType.invalid) {
        throw new Error(`Unsupported chain '${chain}'`);
      }
      let results: any[] = [];
      let { transactionTable } = prepareIndexerTables(chainType);
      for (let table of transactionTable) {
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

    public async blocksWithinTimestampRange(chain: string, from: number, to: number): Promise<DBBlockBase[]> {
      let chainType = MCC.getChainType(chain);
      if (chainType === ChainType.invalid) {
        throw new Error(`Unsupported chain '${chain}'`);
      }
      let { blockTable } = prepareIndexerTables(chainType);
      let query = this.manager
        .createQueryBuilder(blockTable as any, "block")
        .andWhere("block.timestamp >= :from", { from })
        .andWhere("block.timestamp < :to", { to });
      let result = await query.getMany() as DBBlockBase[];
      return result;
    }
    
  }
