import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { SystemStatus } from "../dtos/SystemStatus.dto";
import { VotingRoundRequest } from "../dtos/VotingRoundRequest.dto";
import { VotingRoundResult } from "../dtos/VotingRoundResult.dto";
import { ProofEngineService } from "../services/proof-engine.service";
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { ApiResponseWrapper, ApiResStatusEnum, handleApiResponse } from "../../../common/src";
import { SpecificProofRequest } from "../dtos/SpecificProofRequest.dto";
import { ApiResponseWrapperDec } from "../../../common/src/utils/open-api-utils";
import { ARTypeArray } from "../../../../verification/generated/attestation-request-types";
import { DHTypeArray } from "../../../../verification/generated/attestation-hash-types";

@ApiTags("Proof")
@Controller("api/proof")
@ApiExtraModels(...ARTypeArray, ...DHTypeArray)
export class ProofController {
  constructor(private proofEngine: ProofEngineService) {}

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
      throw new ApiResponseWrapper<VotingRoundResult[]>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
    }
  }

  @Post("get-specific-proof")
  @ApiResponseWrapperDec(VotingRoundResult)
  public async getSpecificProofController(@Body() roundRequest: SpecificProofRequest): Promise<ApiResponseWrapper<VotingRoundResult>> {
    try {
      let result = await this.proofEngine.getSpecificProofForRound(roundRequest.roundId, roundRequest.callData);
      if (result) {
        return new ApiResponseWrapper<VotingRoundResult>(result);
      }
      return new ApiResponseWrapper<VotingRoundResult>(null, ApiResStatusEnum.PENDING);
    } catch (reason: any) {
      throw new ApiResponseWrapper<VotingRoundResult>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
    }
  }

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
      throw new ApiResponseWrapper<VotingRoundRequest[]>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
    }
  }

  /**
   * Get current status of the system
   */
  @Get("status")
  @ApiResponseWrapperDec(SystemStatus)
  public async systemStatus(): Promise<ApiResponseWrapper<SystemStatus>> {
    return handleApiResponse(this.proofEngine.systemStatus());
  }
}
