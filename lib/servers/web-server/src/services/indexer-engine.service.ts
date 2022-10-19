import { ServerConfigurationService } from '@atc/common';
import { ChainType, MCC } from '@flarenetwork/mcc';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DBState } from '../../../../entity/indexer/dbState';
import { DBTransactionBase } from '../../../../entity/indexer/dbTransaction';
import { prepareIndexerTables } from '../../../../indexer/indexer-utils';
import { BlockRange } from '../dtos/BlockRange.dto';

@Injectable()
export class IndexerEngineService {

  constructor(
    private configService: ServerConfigurationService,
    @InjectEntityManager("indexerDatabase") private manager: EntityManager
  ) {}


  public async getStateSetting() {
    let stateQuery = this.manager
      .createQueryBuilder(DBState, "state")
    let res = await stateQuery.getMany();
    return res;
  }

  public async getBlockRange(chain: string): Promise<BlockRange | null> {
    let chainType = MCC.getChainType(chain)
    if(chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`)
    }
    let results: any[] = [];
    let {transactionTable} = prepareIndexerTables(chainType);
    for (let table of transactionTable) {
      let maxQuery = this.manager
      .createQueryBuilder(table as any, "transaction")
      .select("MAX(transaction.blockNumber)", "max")
      .addSelect("MIN(transaction.blockNumber)", "min");
      let res = await maxQuery.getRawOne();
      if(res) {
        results.push(res);
      }      
    }
    if(results.length) {
      return {
        first: Math.min(...results.map(r => r.min as number)),
        last: Math.max(...results.map(r => r.max as number)),
      }
    }
    return null;
  }

  public async getBlockTransactions(chain: string, blockNumber: number): Promise<DBTransactionBase[]> {
    let chainType = MCC.getChainType(chain)
    if(chainType === ChainType.invalid) {
      throw new Error(`Unsupported chain '${chain}'`)
    }
    let results: any[] = [];
    let {transactionTable} = prepareIndexerTables(chainType)
    for (let table of transactionTable) {
      let query = this.manager
        .createQueryBuilder(table as any, "transaction")
        .andWhere("transaction.blockNumber = :blockNumber", { blockNumber });
      results = results.concat(await query.getMany());
    }
    return results.map(res => {
      if(res.response) {
        res.response = JSON.parse(res.response);
      }
      return res;
    }) as DBTransactionBase[];
  }

}
