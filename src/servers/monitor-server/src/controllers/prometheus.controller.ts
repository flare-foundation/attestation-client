import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrometheusEngineService } from "../services/prometheus-engine.service";

@ApiTags("Status")
@Controller("/")
export class PrometheusController {
  constructor(private proofEngine: PrometheusEngineService) {}

  @Get("metrics")
  @Header("Content-Type", "text/html")
  public async servicePrometheusMetrics(): Promise<string> {
    return await this.proofEngine.servicePrometheusMetrics();
  }

  @Get("status/json")
  public async serviceStatusjson(): Promise<string> {
    return await this.proofEngine.serviceStatusJson();
  }

  @Get("status")
  @Header("Content-Type", "text/html")
  public async serviceStatusHtml(): Promise<string> {
    return await this.proofEngine.serviceStatusHtml();
  }
}
