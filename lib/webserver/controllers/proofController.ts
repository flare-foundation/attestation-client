import { Controller, Get, Path, Route, Tags } from "tsoa";
import { Factory, Inject, Singleton } from "typescript-ioc";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
import { VotingRoundResult } from "../dto/VotingRoundResult";
import { ProofEngine } from "../engines/proofEngine";
import { ApiResponse, handleApiResponse } from "../models/ApiResponse";


@Tags('Proof')
@Route("api/proof")
@Singleton
@Factory(() => new ProofController())
export class ProofController extends Controller {

    @Inject
    private proofEngine: ProofEngine;

    constructor() {
        super()
    }

    @Get("votes-for-round/{roundId}")
    public async lastReveals(
        @Path() roundId: number,
    ): Promise<ApiResponse<VotingRoundResult[]>> {
        return handleApiResponse(
            this.proofEngine.getProofForRound(roundId)
        )
    }


}