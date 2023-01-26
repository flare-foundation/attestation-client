import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AttestationRequest, PrepareRequest } from '../../../../verification/attestation-types/attestation-types';
import { ApiResponse, handleApiResponse } from '../../../common/src';
// import { AuthGuard } from '../guards/auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { VerifierProcessor } from '../services/verifier-processors/verifier-processor';

@ApiTags('Verifier')
@Controller("query")
@UseGuards(AuthGuard('api-key'))
@ApiSecurity('X-API-KEY')
export class VerifierController {

  constructor(@Inject("VERIFIER_PROCESSOR") private processor: VerifierProcessor) { }

  @Post("")
  public async processAttestationRequest(@Body() attestationRequest: AttestationRequest): Promise<ApiResponse<any>> {
    return handleApiResponse(
      this.processor.verify(attestationRequest)
    )
  }

  @Post("prepare")
  public async check(@Body() request: PrepareRequest): Promise<ApiResponse<any>> {
    return handleApiResponse(
      this.processor.prepareRequest(request)
    )
  }

}
