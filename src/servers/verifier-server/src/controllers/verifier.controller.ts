import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { AttestationRequest } from "../../../../verification/attestation-types/attestation-types";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
// import { AuthGuard } from '../guards/auth.guard';
import { AuthGuard } from "@nestjs/passport";
import { VerifierProcessor } from "../services/verifier-processors/verifier-processor";
import { ARType } from "../../../../verification/generated/attestation-request-types";

@ApiTags("Verifier")
@Controller("query")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
export class VerifierController {
  constructor(@Inject("VERIFIER_PROCESSOR") private processor: VerifierProcessor) {}

  @Post("")
  public async processAttestationRequest(@Body() attestationRequest: AttestationRequest): Promise<ApiResponseWrapper<any>> {
    return handleApiResponse(this.processor.verify(attestationRequest));
  }

  @Post("prepare")
  public async check(@Body() request: ARType): Promise<ApiResponseWrapper<any>> {
    return handleApiResponse(this.processor.prepareRequest(request));
  }

  @Post("integrity")
  public async getIntegrity(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    return handleApiResponse(this.processor.getMessageIntegrityCheck(request));
  }

  @Post("prepareAttestation")
  public async getAttestationData(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    return handleApiResponse(this.processor.getAttestationData(request));
  }
}
