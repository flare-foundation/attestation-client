import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/src";
import { PrometheusController } from "./controllers/prometheus.controller";
import { PrometheusEngineService } from "./services/prometheus-engine.service";
import { ServerConfigurationService } from "./services/server-configuration.service";

@Module({
  imports: [CommonModule],
  controllers: [PrometheusController],
  providers: [
    {
      provide: "SERVER_CONFIG",
      useFactory: async () => {
        const config = new ServerConfigurationService();
        await config.initialize();
        return config;
      },
    },
    PrometheusEngineService,
  ],
})
export class MonitorServerModule {}
