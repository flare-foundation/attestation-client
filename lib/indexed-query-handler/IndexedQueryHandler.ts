import { ChainType } from "flare-mcc";
import { DBBlockALGO, DBBlockBTC, DBBlockDOGE, DBBlockLTC, DBBlockXRP } from "../entity/dbBlock";
import {
   DBTransactionALGO0, DBTransactionALGO1,
   DBTransactionBase,
   DBTransactionBTC0, DBTransactionBTC1,
   DBTransactionDOGE0, DBTransactionDOGE1,
   DBTransactionLTC0, DBTransactionLTC1,
   DBTransactionXRP0, DBTransactionXRP1
} from "../entity/dbTransaction";
import { Indexer } from "../indexer/indexer";
import { DatabaseService } from "../utils/databaseService";


export interface IndexedQueryHandlerOptions {
   chainType: ChainType;
   rangeDurationSecs: number;
   roundStartTime: (epochId: number) => number;
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
   hash: string;
}

export type IndexerQueryType = "FIRST_CHECK" | "RECHECK";

////////////////////////////////////////////////////////
/// Specific query requests and responses
////////////////////////////////////////////////////////

export interface BlockHashQueryRequest {
   hash: string;
}

export interface BlockHashQueryResponse {
   status: "OK" | "NOT_EXIST",
   block?: any   // TODO - correct type
}


export interface TransactionExistenceQueryRequest {
   txId: string;  // transaction id
   blockNumber: number // block number for the transactio with `txId
   dataAvailability: string // hash of confirmation block(used for syncing of edge - cases)
   roundId: number // voting round id for check
   type: IndexerQueryType   // FIRST_CHECK` or`RECHECK`
}

export interface TransactionExistenceQueryResponse {
   status: "OK" | "RECHECK" | "NOT_EXIST";
   transaction?: any;
}


export interface ReferencedTransactionNonExistenceQueryRequest {
   payementReference: string;  // payment reference
   blockNumber: number // last block number to check (defines upper bound of search interval)
   dataAvailability: string // hash of confirmation block(used for blockNumber
   roundId: number // voting round id for check
   type: IndexerQueryType   // FIRST_CHECK` or`RECHECK`   
}

export interface ReferencedTransactionNonExistenceQueryResponse {
   status: "OK" | "RECHECK",
   transactions?: any[]
   block?: any
}

////////////////////////////////////////////////////////
/// IndexedQueryHandler
////////////////////////////////////////////////////////

export class IndexedQueryHandler {
   indexer: Indexer;
   settings: IndexedQueryHandlerOptions;
   dbService: DatabaseService;

   transactionTable = [undefined, undefined];
   blockTable;

   constructor(indexer: Indexer, options: IndexedQueryHandlerOptions) {
      this.indexer = indexer;
      this.settings = options;
      this.prepareTables();
   }

   prepareTables() {
      switch (this.settings.chainType) {
         case ChainType.BTC:
            this.transactionTable[0] = DBTransactionBTC0;
            this.transactionTable[1] = DBTransactionBTC1;
            this.blockTable = DBBlockBTC;
            break;
         case ChainType.LTC:
            this.transactionTable[0] = DBTransactionLTC0;
            this.transactionTable[1] = DBTransactionLTC1;
            this.blockTable = DBBlockLTC;
            break;
         case ChainType.DOGE:
            this.transactionTable[0] = DBTransactionDOGE0;
            this.transactionTable[1] = DBTransactionDOGE1;
            this.blockTable = DBBlockDOGE;
            break;
         case ChainType.XRP:
            this.transactionTable[0] = DBTransactionXRP0;
            this.transactionTable[1] = DBTransactionXRP1;
            this.blockTable = DBBlockXRP;
            break;
         case ChainType.ALGO:
            this.transactionTable[0] = DBTransactionALGO0;
            this.transactionTable[1] = DBTransactionALGO1;
            this.blockTable = DBBlockALGO;
            break;
         case ChainType.invalid:
            throw new Error("Invalid chain type")
         default:
            // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
            ((_: never): void => { })(this.settings.chainType);
      }
   }

   async queryTransactions(params: TransactionQueryParams): Promise<DBTransactionBase[]> {
      let startTimestamp = this.settings.roundStartTime(params.roundId);
      let query0 = this.dbService.connection.manager
         .createQueryBuilder(this.transactionTable[0], 'transactions')
         .andWhere('transactions.timestamp >= :timestamp', { timestamp: startTimestamp })
         .andWhere('transactions.blockNumber <= :blockNumber', { blockNumber: params.lastConfirmedBlock })
      if (params.paymentReference) {
         query0 = query0.andWhere('transactions.paymentReference=:ref', { ref: params.paymentReference })
      }
      if (params.transactionId) {
         query0 = query0.andWhere('transactions.transactionId = :txId', { txId: params.transactionId })
      }

      const results0 = await query0.getRawMany();

      let query1 = this.dbService.connection.manager
         .createQueryBuilder(this.transactionTable[1], 'transactions')
         .where('transactions.timestamp >= :timestamp', { timestamp: startTimestamp })
         .andWhere('transactions.blockNumber <= :blockNumber', { blockNumber: params.lastConfirmedBlock })
      if (params.paymentReference) {
         query1 = query1.andWhere('transactions.paymentReference=:ref', { ref: params.paymentReference })
      }
      if (params.transactionId) {
         query1 = query1.andWhere('transactions.transactionId = :txId', { txId: params.transactionId })
      }

      const results1 = await query1.getMany();

      return results0.concat(results1);
   }

   async queryBlocks(params: BlockQueryParams) {
      let query = this.dbService.connection.manager
         .createQueryBuilder(this.blockTable, 'blocks')
         .where('blocks.blockHash = :hash', { hash: params.hash })

      let result = await query.getOne();
      if (result) {
         return result;
      }
      return this.indexer.getBlockByHash(params.hash)
   }



}