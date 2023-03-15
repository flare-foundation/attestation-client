import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiQuery, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
import { BlockRange } from "../dtos/BlockRange.dto";
// import { AuthGuard } from '../guards/auth.guard';
import { AuthGuard } from "@nestjs/passport";
import { IndexerEngineService } from "../services/indexer-engine.service";
import { ApiDBState } from "../dtos/ApiDbState";
import { ApiDBTransaction } from "../dtos/ApiDbTransaction";
import { ApiDBBlock } from "../dtos/ApiDbBlock";
// @ApiSecurity('X-API-KEY', ['X-API-KEY'])

@ApiTags("Indexer")
@Controller("api/indexer")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
export class IndexerController {
  constructor(private indexerEngine: IndexerEngineService) { }

  /**
   * Gets the state entries from the indexer database.
   * @returns 
   */
  @Get("state")
  public async indexerState(): Promise<ApiResponseWrapper<ApiDBState[]>> {
    return handleApiResponse(this.indexerEngine.getStateSetting());
  }

  /**
   * Gets the range of available confirmed blocks in the indexer database.
   * @returns 
   */
  @Get("block-range")
  public async blockRange(): Promise<ApiResponseWrapper<BlockRange | null>> {
    return handleApiResponse(this.indexerEngine.getBlockRange());
  }

  /**
   * Gets the transaction for a given transaction id (hash).
   * @param txHash 
   * @returns 
   */
  @Get("transaction/:txHash")
  public async transaction(@Param("txHash") txHash: string): Promise<ApiResponseWrapper<ApiDBTransaction>> {
    return handleApiResponse(this.indexerEngine.getTransaction(txHash));
  }

  /**
   * Gets a block with given hash from the indexer database.
   * @param blockHash 
   * @returns 
   */
  @Get("block/:blockHash")
  public async block(@Param("blockHash") blockHash: string): Promise<ApiResponseWrapper<ApiDBBlock>> {
    return handleApiResponse(this.indexerEngine.getBlock(blockHash));
  }

  /**
   * Gets confirmed block with the given block number. 
   * Blocks that are not confirmed yet cannot be obtained using this route.
   * @param blockNumber 
   * @returns 
   */
  @Get("confirmed-block-at/:blockNumber")
  public async confirmedBlockAt(@Param("blockNumber", new ParseIntPipe()) blockNumber: number): Promise<ApiResponseWrapper<ApiDBBlock>> {
    return handleApiResponse(this.indexerEngine.confirmedBlockAt(blockNumber));
  }

  /**
   * Gets the indexed block height.
   * @returns 
   */
  @Get("block-height")
  public async blockHeight(): Promise<ApiResponseWrapper<number>> {
    return handleApiResponse(this.indexerEngine.getBlockHeight());
  }

  /**
   * Returns block header data for the transaction with the given transaction id
   * @param txHash 
   * @returns 
   */
  @Get("transaction-block/:txHash")
  public async transactionBlock(@Param("txHash") txHash: string): Promise<ApiResponseWrapper<ApiDBBlock>> {
    return handleApiResponse(this.indexerEngine.getTransactionBlock(txHash));
  }

  /**
   * Paged query for confirmed transactions subject to conditions from query parameters.
   * Transactions are sorted first by block number and then by transaction id.
   * @param from Minimal block number of query range
   * @param to Maximal block number of the query range
   * @param paymentReference 0x-prefixed lowercase hex string representing 32-bytes
   * @param limit Query limit. Capped by server config settings
   * @param offset Query offset
   * @returns 
   */
  @ApiQuery({
    name: "from",
    type: Number,
    description: "Minimal block number of query range",
    required: false
  })
  @ApiQuery({
    name: "to",
    type: Number,
    description: "Maximal block number of the query range",
    required: false
  })
  @ApiQuery({
    name: "paymentReference",
    type: String,
    description: "0x-prefixed lowercase hex string representing 32-bytes",
    required: false
  })
  @ApiQuery({
    name: "limit",
    type: Number,
    description: "Query limit. Capped by server config settings",
    required: false
  })
  @ApiQuery({
    name: "offset",
    type: Number,
    description: "Query offset",
    required: false
  })
  @Get("transactions")
  public async transactionsWithinBlockRange(
    @Query("from") from?: number,
    @Query("to") to?: number,
    @Query("paymentReference") paymentReference?: string,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<ApiResponseWrapper<ApiDBTransaction[]>> {
    return handleApiResponse(this.indexerEngine.getTransactionsWithinBlockRange(from, to, paymentReference, limit, offset));
  }

}
