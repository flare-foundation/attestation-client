import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { SystemStatus } from "../dtos/SystemStatus.dto";
import { VotingRoundRequest } from "../dtos/VotingRoundRequest.dto";
import { VotingRoundResult } from "../dtos/VotingRoundResult.dto";
import { ProofEngineService } from "../services/proof-engine.service";
import { ApiTags } from "@nestjs/swagger";
import { ApiResponse, handleApiResponse } from "../../../common/src";

export interface SpecificProofRequest {
  roundId: number;
  callData: string;
}

@ApiTags("Proof")
@Controller("api/proof")
export class ProofController {
  constructor(private proofEngine: ProofEngineService) {}

  @Get("votes-for-round/:roundId")
  public async votesForRound(@Param("roundId", new ParseIntPipe()) roundId: number): Promise<ApiResponse<VotingRoundResult[]>> {
    try {
      let result = await this.proofEngine.getVoteResultsForRound(roundId);
      if (result) {
        return new ApiResponse<VotingRoundResult[]>(result);
      }
      return new ApiResponse<VotingRoundResult[]>([], "PENDING");
    } catch (reason: any) {
      throw new ApiResponse<VotingRoundResult[]>(undefined as any, "ERROR", "" + reason, reason);
    }
  }

  @Post("get-specific-proof")
  public async getSpecificProofController(@Body() roundRequest: SpecificProofRequest): Promise<ApiResponse<VotingRoundResult>> {
    try {
      let result = await this.proofEngine.getSpecificProofForRound(roundRequest.roundId, roundRequest.callData);
      if (result) {
        return new ApiResponse<VotingRoundResult>(result);
      }
      return new ApiResponse<VotingRoundResult>(null, "PENDING");
    } catch (reason: any) {
      throw new ApiResponse<VotingRoundResult>(undefined as any, "ERROR", "" + reason, reason);
    }
  }

  @Get("requests-for-round/:roundId")
  public async requestsForRound(@Param("roundId", new ParseIntPipe()) roundId: number): Promise<ApiResponse<VotingRoundRequest[]>> {
    try {
      let result = await this.proofEngine.getRequestsForRound(roundId);
      if (result) {
        return new ApiResponse<VotingRoundRequest[]>(result);
      }
      return new ApiResponse<VotingRoundRequest[]>([], "PENDING");
    } catch (reason: any) {
      throw new ApiResponse<VotingRoundRequest[]>(undefined as any, "ERROR", "" + reason, reason);
    }
  }

  @Get("status")
  public async systemStatus(): Promise<ApiResponse<SystemStatus>> {
    return handleApiResponse(this.proofEngine.systemStatus());
  }
}
