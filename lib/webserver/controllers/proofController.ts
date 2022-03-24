import { Controller, Get, Path, Route, Tags } from "tsoa";
import { Factory, Inject, Singleton } from "typescript-ioc";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
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

    // @Get("check-session/{sessionId}")
    // public async sessionInDatabase(
    //     @Path() sessionId: string,
    // ): Promise<ApiResponse<any>> {
    //     if(!process.env.AUTH_TOKEN) return new ApiResponse(true);
    //     const result = process.env.AUTH_TOKEN === sessionId || process.env.ADMIN_AUTH_TOKEN === sessionId;

    //     if (result) {
    //         this.setHeader("Set-Cookie", `flare-auth-token=${sessionId}; HttpOnly; Path=/; Max-Age=86400`)
    //     }
    //     else {
    //         this.setHeader("Set-Cookie", "flare-auth-token=x; HttpOnly; Path=/; Max-Age=-1")
    //     }
    //     return new ApiResponse(result)
    // }


    @Get("votes-for-round/{roundId}")
    public async lastReveals(
        @Path() roundId: number,
    ): Promise<ApiResponse<DBVotingRoundResult[]>> {
        return handleApiResponse(
            this.proofEngine.getProofForRound(roundId)
        )
    }


}