import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { getGlobalLogger } from "../../../../utils/logging/logger";
import { ApiResponseWrapper, ApiResStatusEnum, handleApiResponse } from "../../../common/src";
import { ApiResponseWrapperDec } from "../../../common/src/utils/open-api-utils";
import { SpecificProofRequest } from "../dtos/SpecificProofRequest.dto";
import { SystemStatus } from "../dtos/SystemStatus.dto";
import { VotingRoundRequest } from "../dtos/VotingRoundRequest.dto";
import { VotingRoundResult } from "../dtos/VotingRoundResult.dto";
import { DHTypeArray } from "../dtos/w-hash-types.dto";
import { ARTypeArray } from "../dtos/w-request-types.dto";
import { ProofEngineService } from "../services/proof-engine.service";

@ApiTags("Proof")
@Controller("api/proof")
@ApiExtraModels(...ARTypeArray, ...DHTypeArray)
export class ProofController {
  logger = getGlobalLogger();
  constructor(private proofEngine: ProofEngineService) {}

  /**
   * Returns all vote data of the attestation provider for the voting round @param roundId
   * that was included into its Merkle tree. The data contains attestation responses, requests, the hash in
   * Merkle tree and the Merkle proof. The data can be used to fully assemble the Merkle tree used in the vote.
   * @param roundId
   * @returns
   */
  @Get("votes-for-round/:roundId")
  @ApiResponseWrapperDec(VotingRoundResult, true)
  public async votesForRound(@Param("roundId", new ParseIntPipe()) roundId: number): Promise<ApiResponseWrapper<VotingRoundResult[]>> {
    try {
      let result = await this.proofEngine.getVoteResultsForRound(roundId);

      if (result) {
        return new ApiResponseWrapper<VotingRoundResult[]>(result);
      }
      return new ApiResponseWrapper<VotingRoundResult[]>([], ApiResStatusEnum.PENDING);
    } catch (reason: any) {
      return new ApiResponseWrapper<VotingRoundResult[]>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
    }
  }

  /**
   * Returns proof data for specific attestation request.
   * Attestation request is identified by the request data and round id in which it was submitted.
   * @param roundRequest
   * @returns
   */
  @Post("get-specific-proof")
  @HttpCode(200)
  @ApiResponseWrapperDec(VotingRoundResult)
  public async getSpecificProofController(@Body() roundRequest: SpecificProofRequest): Promise<ApiResponseWrapper<VotingRoundResult>> {
    try {
      const canReveal = this.proofEngine.canReveal(roundRequest.roundId);
      if (!canReveal) {
        return new ApiResponseWrapper<VotingRoundResult>(null, ApiResStatusEnum.PENDING);
      }
      let result = await this.proofEngine.getSpecificProofForRound(roundRequest.roundId, roundRequest.callData);
      if (result) {
        return new ApiResponseWrapper<VotingRoundResult>(result);
      }
      throw new Error("Proof not found");
    } catch (reason: any) {
      return new ApiResponseWrapper<VotingRoundResult>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
    }
  }

  /**
   * Lists all requests received by attestation client.
   * Each request includes its processing status.
   * @param roundId
   * @returns
   */
  @Get("requests-for-round/:roundId")
  @ApiResponseWrapperDec(VotingRoundRequest, true)
  public async requestsForRound(@Param("roundId", new ParseIntPipe()) roundId: number): Promise<ApiResponseWrapper<VotingRoundRequest[]>> {
    try {
      let result = await this.proofEngine.getRequestsForRound(roundId);
      if (result) {
        return new ApiResponseWrapper<VotingRoundRequest[]>(result);
      }
      return new ApiResponseWrapper<VotingRoundRequest[]>([], ApiResStatusEnum.PENDING);
    } catch (reason: any) {
      return new ApiResponseWrapper<VotingRoundRequest[]>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
    }
  }

  /**
   * Get current status of the system
   */
  @Get("status")
  @ApiResponseWrapperDec(SystemStatus)
  public async systemStatus(): Promise<ApiResponseWrapper<SystemStatus>> {
    return handleApiResponse(this.proofEngine.systemStatus(), this.logger);
  }
}
