import { ApiResponse, handleApiResponse } from '@atc/common';
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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

}
