import { Controller, Get, Path, Route, Tags } from "tsoa";
import { Factory, Inject, Singleton } from "typescript-ioc";
import { SystemStatus } from "../dto/SystemStatus";
import { VotingRoundRequest } from "../dto/VotingRoundRequest";
import { VotingRoundResult } from "../dto/VotingRoundResult";
import { ProofEngine } from "../engines/proofEngine";
import { ApiResponse, handleApiResponse } from "../models/ApiResponse";

@Tags("Proof")
@Route("api/proof")
@Singleton
@Factory(() => new ProofController())
export class ProofController extends Controller {
  @Inject
  private proofEngine: ProofEngine;

  constructor() {
    super();
  }

  @Get("votes-for-round/{roundId}")
  public async votesForRound(@Path() roundId: number): Promise<ApiResponse<VotingRoundResult[]>> {
    try {
      const result = await this.proofEngine.getProofForRound(roundId);
      if (result) {
        return new ApiResponse<VotingRoundResult[]>(result);
      }
      return new ApiResponse<VotingRoundResult[]>([], "PENDING");
    } catch (reason: any) {
      throw new ApiResponse<VotingRoundResult[]>(undefined as any, "ERROR", "" + reason, reason);
    }
  }

  @Get("requests-for-round/{roundId}")
  public async requestsForRound(@Path() roundId: number): Promise<ApiResponse<VotingRoundRequest[]>> {
    try {
      const result = await this.proofEngine.getRequestsForRound(roundId);
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
