import { Controller, Get, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { DBBlockBase } from "../../../../entity/indexer/dbBlock";
import { DBState } from "../../../../entity/indexer/dbState";
import { DBTransactionBase } from "../../../../entity/indexer/dbTransaction";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
import { BlockRange } from "../dtos/BlockRange.dto";
// import { AuthGuard } from '../guards/auth.guard';
import { AuthGuard } from "@nestjs/passport";
import { IndexerEngineService } from "../services/indexer-engine.service";
// @ApiSecurity('X-API-KEY', ['X-API-KEY'])

@ApiTags("Indexer")
@Controller("api/indexer")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
export class IndexerController {
  constructor(private indexerEngine: IndexerEngineService) {}

  @Get("state")
  public async indexerState(): Promise<ApiResponseWrapper<DBState[]>> {
    return handleApiResponse(this.indexerEngine.getStateSetting());
  }

  @Get("block-range")
  public async blockRange(): Promise<ApiResponseWrapper<BlockRange | null>> {
    return handleApiResponse(this.indexerEngine.getBlockRange());
  }

  @Get("transactions-in-block/:blockNumber")
  public async transactionsInBlock(@Param("blockNumber", new ParseIntPipe()) blockNumber: number): Promise<ApiResponseWrapper<DBTransactionBase[]>> {
    return handleApiResponse(this.indexerEngine.getBlockTransactions(blockNumber));
  }

  @Get("transaction/:txHash")
  public async transaction(@Param("txHash") txHash: string): Promise<ApiResponseWrapper<DBTransactionBase>> {
    return handleApiResponse(this.indexerEngine.getTransaction(txHash));
  }

  @Get("block/:blockHash")
  public async block(@Param("blockHash") blockHash: string): Promise<ApiResponseWrapper<DBBlockBase>> {
    return handleApiResponse(this.indexerEngine.getBlock(blockHash));
  }

  @Get("block-at/:blockNumber")
  public async blockAt(@Param("blockNumber", new ParseIntPipe()) blockNumber: number): Promise<ApiResponseWrapper<DBBlockBase>> {
    return handleApiResponse(this.indexerEngine.getBlockAt(blockNumber));
  }

  @Get("block-height")
  public async blockHeight(): Promise<ApiResponseWrapper<number>> {
    return handleApiResponse(this.indexerEngine.getBlockHeight());
  }

  @Get("transaction-block/:txHash")
  public async transactionBlock(@Param("txHash") txHash: string): Promise<ApiResponseWrapper<DBBlockBase>> {
    return handleApiResponse(this.indexerEngine.getTransactionBlock(txHash));
  }

  @Get("transactions/payment-reference/:reference")
  public async transactionsWithPaymentReference(@Param("reference") reference: string): Promise<ApiResponseWrapper<DBTransactionBase[]>> {
    return handleApiResponse(this.indexerEngine.getTransactionsWithPaymentReference(reference));
  }

  @Get("transactions/from/:from/to/:to")
  public async transactionsWithinTimestampRange(@Param("from") from: number, @Param("to") to: number): Promise<ApiResponseWrapper<DBTransactionBase[]>> {
    return handleApiResponse(this.indexerEngine.transactionsWithinTimestampRange(from, to));
  }

  @Get("blocks/from/:from/to/:to")
  public async blocksWithinTimestampRange(@Param("from") from: number, @Param("to") to: number): Promise<ApiResponseWrapper<DBBlockBase[]>> {
    return handleApiResponse(this.indexerEngine.blocksWithinTimestampRange(from, to));
  }
}
