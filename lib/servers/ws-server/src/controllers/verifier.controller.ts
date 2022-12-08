import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AttestationRequest } from '../../../../verification/attestation-types/attestation-types';
import { ApiResponse, handleApiResponse } from '../../../common/src';
import { VerifierProcessor } from '../services/verifier-processors/verifier-processor';

@ApiTags('Verifier')
@Controller("query")
export class VerifierController {

  constructor(private processor: VerifierProcessor) { }

  @Post("")
  public async processAttestationRequest(@Body() attestationRequest: AttestationRequest): Promise<ApiResponse<any>> {
    return handleApiResponse(
      this.processor.verify(attestationRequest)
    )
  }

}
