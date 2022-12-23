import { ApiResponse, handleApiResponse } from '@atc/common';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ServiceStatus } from '../dtos/ServiceStatus.dto';
import { ProofEngineService } from '../services/proof-engine.service';


@ApiTags('Status')
@Controller("api/status")
export class StatusController {

  constructor(private proofEngine: ProofEngineService) { }

  @Get("services")
  public async serviceStatus(): Promise<ApiResponse<ServiceStatus>> {
    return handleApiResponse(this.proofEngine.serviceStatus());
  }

  @Get("services-html")
  @Header('Content-Type', "text/html")
  public async serviceStatusHtml(): Promise<string> {
    return await this.proofEngine.serviceStatusHtml();
  }
}
