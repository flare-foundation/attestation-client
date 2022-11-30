import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse, handleApiResponse } from '../../../common/src';
import { XRPProcessorService } from '../services/xrp-processor';

@ApiTags('Verifier')
@Controller("query")
export class VerifierController {

  constructor(private processor: XRPProcessorService) { }

  @Post("")
  public async processAttestationRequest(@Body() attestationRequest: any): Promise<ApiResponse<any>> {
    return handleApiResponse(
      this.processor.verify(attestationRequest.data)
    )
  }

}
