import { ApiResponse, handleApiResponse } from '@atc/common';
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DBBlockBase } from '../../../../entity/indexer/dbBlock';
import { DBState } from '../../../../entity/indexer/dbState';
import { DBTransactionBase } from '../../../../entity/indexer/dbTransaction';
import { BlockRange } from '../dtos/BlockRange.dto';
import { IndexerEngineService } from '../services/indexer-engine.service';

@ApiTags('Indexer')
@Controller("api/indexer")
export class IndexerController {

  constructor(private indexerEngine: IndexerEngineService) { }

  @Get("state")
  public async indexerState(): Promise<ApiResponse<DBState[]>> {
    return handleApiResponse(this.indexerEngine.getStateSetting());
  }

  @Get("chain/:chain/block-range")
  public async blockRange(
    @Param('chain') chain: string
  ): Promise<ApiResponse<BlockRange | null>> {
    return handleApiResponse(this.indexerEngine.getBlockRange(chain));
  }

  @Get("chain/:chain/transactions-in-block/:blockNumber")
  public async transactionsInBlock(
    @Param('chain') chain: string,
    @Param('blockNumber', new ParseIntPipe()) blockNumber: number
  ): Promise<ApiResponse<DBTransactionBase[]>> {
    return handleApiResponse(this.indexerEngine.getBlockTransactions(chain, blockNumber));
  }

  @Get("chain/:chain/transaction/:txHash")
  public async transaction(
    @Param('chain') chain: string,
    @Param('txHash') txHash: string
  ): Promise<ApiResponse<DBTransactionBase>> {
    return handleApiResponse(this.indexerEngine.getTransaction(chain, txHash));
  }

  @Get("chain/:chain/block/:blockHash")
  public async block(
    @Param('chain') chain: string,
    @Param('blockHash') blockHash: string
  ): Promise<ApiResponse<DBBlockBase>> {
    return handleApiResponse(this.indexerEngine.getBlock(chain, blockHash));
  }

  @Get("chain/:chain/block-at/:blockNumber")
  public async blockAt(
    @Param('chain') chain: string,
    @Param('blockNumber', new ParseIntPipe()) blockNumber: number
  ): Promise<ApiResponse<DBBlockBase>> {
    return handleApiResponse(this.indexerEngine.getBlockAt(chain, blockNumber));
  }

  @Get("chain/:chain/block-height")
  public async blockHeight(
    @Param('chain') chain: string,
  ): Promise<ApiResponse<number>> {
    return handleApiResponse(this.indexerEngine.getBlockHeight(chain));
  }

  @Get("chain/:chain/transaction-block/:txHash")
  public async transactionBlock(
    @Param('chain') chain: string,
    @Param('txHash') txHash: string
  ): Promise<ApiResponse<DBBlockBase>> {
    return handleApiResponse(this.indexerEngine.getTransactionBlock(chain, txHash));
  }

  @Get("chain/:chain/transactions/payment-reference/:reference")
  public async transactionsWithPaymentReference(
    @Param('chain') chain: string,
    @Param('reference') reference: string
  ): Promise<ApiResponse<DBTransactionBase[]>> {
    return handleApiResponse(this.indexerEngine.getTransactionsWithPaymentReference(chain, reference));
  }
  
  @Get("chain/:chain/transactions/from/:from/to/:to")
  public async transactionsWithinTimestampRange(
    @Param('chain') chain: string,
    @Param('from') from: number,
    @Param('to') to: number
  ): Promise<ApiResponse<DBTransactionBase[]>> {
    return handleApiResponse(this.indexerEngine.transactionsWithinTimestampRange(chain, from, to));
  }

  @Get("chain/:chain/blocks/from/:from/to/:to")
  public async blocksWithinTimestampRange(
    @Param('chain') chain: string,
    @Param('from') from: number,
    @Param('to') to: number
  ): Promise<ApiResponse<DBBlockBase[]>> {
    return handleApiResponse(this.indexerEngine.blocksWithinTimestampRange(chain, from, to));
  }
}
