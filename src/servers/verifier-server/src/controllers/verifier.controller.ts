import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { AttestationRequest, Verification } from "../../../../verification/attestation-types/attestation-types";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
// import { AuthGuard } from '../guards/auth.guard';
import { AuthGuard } from "@nestjs/passport";
import { VerifierProcessor } from "../services/verifier-processors/verifier-processor";
import { ARType, ARTypeArray } from "../../../../verification/generated/attestation-request-types";
import { DHType, DHTypeArray } from "../../../../verification/generated/attestation-hash-types";
import { ApiResponseWrapperDec } from "../../../common/src/utils/open-api-utils";

@ApiTags("Verifier")
@Controller("query")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
@ApiExtraModels(...ARTypeArray, ...DHTypeArray)
export class VerifierController {
  constructor(@Inject("VERIFIER_PROCESSOR") private processor: VerifierProcessor) {}

  /**
   * Verifies attestation request.
   * @param attestationRequest 
   * @returns
   */
  @Post("")
  @ApiResponseWrapperDec(Verification)
  public async processAttestationRequest(@Body() attestationRequest: AttestationRequest): Promise<ApiResponseWrapper<Verification<ARType, DHType>>> {
    return handleApiResponse(this.processor.verify(attestationRequest));
  }

  /**
   * Given parsed @request in JSON with possibly invalid message integrity code it returns the verification object.
   * @param request 
   * @returns 
   */
  @Post("prepare")
  @ApiResponseWrapperDec(Verification)
  public async check(@Body() request: ARType): Promise<ApiResponseWrapper<Verification<ARType, DHType>>> {
    return handleApiResponse(this.processor.prepareRequest(request));
  }

  @Post("integrity")
  @ApiResponseWrapperDec(String)
  public async getIntegrity(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    return handleApiResponse(this.processor.getMessageIntegrityCheck(request));
  }

  @Post("prepareAttestation")
  @ApiResponseWrapperDec(String)
  public async getAttestationData(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    return handleApiResponse(this.processor.getAttestationData(request));
  }
}
