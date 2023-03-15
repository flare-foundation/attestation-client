import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
// import { AuthGuard } from '../guards/auth.guard';
import { AuthGuard } from "@nestjs/passport";
import { ApiResponseWrapperDec } from "../../../common/src/utils/open-api-utils";
import { APIAttestationRequest } from "../dtos/APIAttestationRequest.dto";
import { APIVerification } from "../dtos/APIVerification.dto";
import { VerifierProcessor } from "../services/verifier-processors/verifier-processor";
import { ARType, ARTypeArray } from "../dtos/v-request-types.dto";
import { DHType, DHTypeArray } from "../dtos/v-hash-types.dto";

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
  @ApiResponseWrapperDec(APIVerification)
  public async processAttestationRequest(@Body() attestationRequest: APIAttestationRequest): Promise<ApiResponseWrapper<APIVerification<ARType, DHType>>> {
    return handleApiResponse(this.processor.verify(attestationRequest));
  }

  /**
   * Given parsed @param request in JSON with possibly invalid message integrity code it returns the verification object.
   * @param request
   * @returns
   */
  @Post("prepare")
  @ApiResponseWrapperDec(APIVerification)
  public async check(@Body() request: ARType): Promise<ApiResponseWrapper<APIVerification<ARType, DHType>>> {
    return handleApiResponse(this.processor.prepareRequest(request));
  }

  /**
   * Given parsed @param request in JSON with possibly invalid message integrity code it returns the message integrity code.
   * @param request
   * @returns
   */
  @Post("integrity")
  @ApiResponseWrapperDec(String)
  public async getIntegrity(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    return handleApiResponse(this.processor.getMessageIntegrityCheck(request));
  }

  /**
   * Given parsed @param request in JSON with possibly invalid message integrity code it returns the byte encoded
   * attestation request with the correct message integrity code. The response can be directly used for submitting
   * attestation request to StateConnector smart contract.
   * @param request
   * @returns
   */
  @Post("prepareAttestation")
  @ApiResponseWrapperDec(String)
  public async getAttestationData(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    return handleApiResponse(this.processor.getAttestationData(request));
  }
}
