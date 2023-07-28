import { Body, Controller, HttpCode, Inject, Post, UseGuards, UsePipes } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiExtraModels, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { getGlobalLogger } from "../../../../utils/logging/logger";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
import { ApiBodyUnion, ApiResponseWrapperDec } from "../../../common/src/utils/open-api-utils";
import { APIAttestationRequest } from "../dtos/APIAttestationRequest.dto";
import { APIVerification } from "../dtos/APIVerification.dto";
import { DHType, DHTypeArray } from "../dtos/v-hash-types.dto";
import { ARType, ARTypeArray } from "../dtos/v-request-types.dto";
import { AttestationRequestValidationPipe } from "../pipes/AttestationRequestBodyValidation.pipe";
import { VerifierProcessor } from "../services/verifier-processors/verifier-processor";
import { ZERO_BYTES_32 } from "@flarenetwork/mcc";

@ApiTags("Verifier")
@Controller("query")
@UseGuards(AuthGuard("api-key"))
@ApiSecurity("X-API-KEY")
@ApiExtraModels(...ARTypeArray, ...DHTypeArray)
export class VerifierController {
  logger = getGlobalLogger();

  constructor(@Inject("VERIFIER_PROCESSOR") private processor: VerifierProcessor) {}

  /**
   * Verifies attestation request.
   * @param attestationRequest
   * @returns
   */
  @Post("")
  @HttpCode(200)
  @ApiResponseWrapperDec(APIVerification)
  public async processAttestationRequest(@Body() attestationRequest: APIAttestationRequest): Promise<ApiResponseWrapper<APIVerification<ARType, DHType>>> {
    return handleApiResponse(this.processor.verify(attestationRequest), this.logger);
  }

  /**
   * Given parsed @param request in JSON with a possibly invalid message integrity code (MIC) it returns the verification object.
   * @param request
   * @returns
   */
  @Post("prepare")
  @HttpCode(200)
  @ApiResponseWrapperDec(APIVerification)
  @ApiBodyUnion(ARTypeArray)
  @UsePipes(new AttestationRequestValidationPipe())
  public async prepare(@Body() request: ARType): Promise<ApiResponseWrapper<APIVerification<ARType, DHType>>> {
    const code = request.messageIntegrityCode;
    if (!code || !(typeof code === "string") || !/^0x[0-9a-f]{64}$/i.test(code)) {
      request.messageIntegrityCode = ZERO_BYTES_32;
    }
    return handleApiResponse(this.processor.prepareRequest(request), this.logger);
  }

  /**
   * Given parsed @param request in JSON with possibly invalid message integrity code it returns the message integrity code.
   * @param request
   * @returns
   */
  @Post("integrity")
  @HttpCode(200)
  @ApiResponseWrapperDec(String)
  @ApiBodyUnion(ARTypeArray)
  @UsePipes(new AttestationRequestValidationPipe())
  public async getIntegrityCode(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    const code = request.messageIntegrityCode;
    if (!code || !(typeof code === "string") || !/^0x[0-9a-f]{64}$/i.test(code)) {
      request.messageIntegrityCode = ZERO_BYTES_32;
    }
    return handleApiResponse(this.processor.getMessageIntegrityCheck(request), this.logger);
  }

  /**
   * Given parsed @param request in JSON with a possibly invalid message integrity code it returns the byte encoded
   * attestation request with the correct message integrity code. The response can be directly used for submitting
   * attestation request to StateConnector smart contract.
   * @param request
   * @returns
   */
  @Post("prepareAttestation")
  @HttpCode(200)
  @ApiResponseWrapperDec(String)
  @ApiBodyUnion(ARTypeArray)
  @UsePipes(new AttestationRequestValidationPipe())
  public async prepareAttestationData(@Body() request: ARType): Promise<ApiResponseWrapper<string>> {
    const code = request.messageIntegrityCode;
    if (!code || !(typeof code === "string") || !/^0x[0-9a-f]{64}$/i.test(code)) {
      request.messageIntegrityCode = ZERO_BYTES_32;
    }
    return handleApiResponse(this.processor.getAttestationData(request), this.logger);
  }
}
