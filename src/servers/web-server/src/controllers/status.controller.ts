import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiResponseWrapper, handleApiResponse } from "../../../common/src";
import { ServiceStatus } from "../dtos/ServiceStatus.dto";
import { ProofEngineService } from "../services/proof-engine.service";

@ApiTags("Status")
@Controller("api/status")
export class StatusController {
  constructor(private proofEngine: ProofEngineService) {}

  @Get("services")
  public async serviceStatus(): Promise<ApiResponseWrapper<ServiceStatus>> {
    return handleApiResponse(this.proofEngine.serviceStatus());
  }

  @Get("services-html")
  @Header("Content-Type", "text/html")
  public async serviceStatusHtml(): Promise<string> {
    return await this.proofEngine.serviceStatusHtml();
  }
}
