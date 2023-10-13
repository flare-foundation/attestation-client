import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { getGlobalLogger } from "../../../../../utils/logging/logger";
import { IndexerEngineService } from "../../services/indexer-engine.service";
import { ApiResponseWrapper, handleApiResponse } from "../../../../common/src";
import { ApiDBState } from "../../dtos/indexer/ApiDbState";
import { BlockRange } from "../../dtos/indexer/BlockRange.dto";
import { ApiDBTransaction } from "../../dtos/indexer/ApiDbTransaction";
import { ApiDBBlock } from "../../dtos/indexer/ApiDbBlock";
import { QueryTransaction } from "../../dtos/indexer/QueryTransaction.dto";

@ApiTags("Indexer")
@Controller("api/indexer")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
export class DOGEIndexerController {
  logger = getGlobalLogger();
  constructor(private indexerEngine: IndexerEngineService) {}

  /**
   * Gets the state entries from the indexer database.
   * @returns
   */
  @Get("state")
  public async indexerState(): Promise<ApiResponseWrapper<ApiDBState[]>> {
    return handleApiResponse(this.indexerEngine.getStateSetting(), this.logger);
  }

  /**
   * Gets the range of available confirmed blocks in the indexer database.
   * @returns
   */
  @Get("block-range")
  public async blockRange(): Promise<ApiResponseWrapper<BlockRange | null>> {
    return handleApiResponse(this.indexerEngine.getBlockRange(), this.logger);
  }

  /**
   * Gets the transaction for a given transaction id (hash).
   * @param txHash
   * @returns
   */
  @Get("transaction/:txHash")
  public async transaction(@Param("txHash") txHash: string): Promise<ApiResponseWrapper<ApiDBTransaction>> {
    return handleApiResponse(this.indexerEngine.getTransaction(txHash), this.logger);
  }

  /**
   * Gets a block with given hash from the indexer database.
   * @param blockHash
   * @returns
   */
  @Get("block/:blockHash")
  public async block(@Param("blockHash") blockHash: string): Promise<ApiResponseWrapper<ApiDBBlock>> {
    return handleApiResponse(this.indexerEngine.getBlock(blockHash), this.logger);
  }

  /**
   * Gets confirmed block with the given block number.
   * Blocks that are not confirmed yet cannot be obtained using this route.
   * @param blockNumber
   * @returns
   */
  @Get("confirmed-block-at/:blockNumber")
  public async confirmedBlockAt(@Param("blockNumber", new ParseIntPipe()) blockNumber: number): Promise<ApiResponseWrapper<ApiDBBlock>> {
    return handleApiResponse(this.indexerEngine.confirmedBlockAt(blockNumber), this.logger);
  }

  /**
   * Gets the indexed block height.
   * @returns
   */
  @Get("block-height")
  public async blockHeight(): Promise<ApiResponseWrapper<number>> {
    return handleApiResponse(this.indexerEngine.getBlockHeight(), this.logger);
  }

  /**
   * Returns block header data for the transaction with the given transaction id
   * @param txHash
   * @returns
   */
  @Get("transaction-block/:txHash")
  public async transactionBlock(@Param("txHash") txHash: string): Promise<ApiResponseWrapper<ApiDBBlock>> {
    return handleApiResponse(this.indexerEngine.getTransactionBlock(txHash), this.logger);
  }

  /**
   * Paged query for confirmed transactions subject to conditions from query parameters.
   * Transactions are sorted first by block number and then by transaction id.
   * @param from Minimal block number of query range
   * @param to Maximal block number of the query range
   * @param paymentReference 0x-prefixed lowercase hex string representing 32-bytes
   * @param limit Query limit. Capped by server config settings
   * @param offset Query offset
   * @param returnResponse Whether response from node stored in the indexer database should be returned
   * @returns
   */

  @Get("transactions")
  public async transactionsWithinBlockRange(@Query() query: QueryTransaction): Promise<ApiResponseWrapper<ApiDBTransaction[]>> {
    return handleApiResponse(
      this.indexerEngine.getTransactionsWithinBlockRange(query.from, query.to, query.paymentReference, query.limit, query.offset, query.returnResponse),
      this.logger
    );
  }
}
