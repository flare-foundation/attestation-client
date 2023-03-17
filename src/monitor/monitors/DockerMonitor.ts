import { ChainType, MCC } from "@flarenetwork/mcc";
import { getTimeMs } from "../../utils/helpers/internetTime";
import { round } from "../../utils/helpers/utils";
import { AttLogger, getGlobalLogger } from "../../utils/logging/logger";
import { Docker, DockerInfo } from "../../utils/monitoring/Docker";
import { MonitorBase, MonitorStatus, PerformanceMetrics } from "../MonitorBase";
import { MonitorConfig } from "../MonitorConfiguration";
import { MonitorConfigBase } from "../MonitorConfigBase";

/**
 * Docker monitor configuration class.
 */
export class MonitorDockerConfig extends MonitorConfigBase {
  getName() {
    return "DockerMonitor";
  }

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new DockerMonitor(<MonitorDockerConfig>config, baseConfig, logger);
  }
}

/**
 * Docker monitor.
 */
export class DockerMonitor extends MonitorBase<MonitorDockerConfig> {
  static dockerInfo: DockerInfo;

  timeCheck = 0;

  chainType: ChainType;

  async initialize() {
    this.chainType = MCC.getChainType(this.config.name);
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    const now = getTimeMs();
    if (now > this.timeCheck) {
      getGlobalLogger().debug("DockerMonitor: updating docker info...");
      DockerMonitor.dockerInfo = Docker.getDockerInfo();

      // check once per 10 minutes
      this.timeCheck = now + 60 * 10 * 1000;
    }

    if (!DockerMonitor.dockerInfo) return null;

    const rep = DockerMonitor.dockerInfo.repositoryInfo.find((x) => x.repository.indexOf(this.name) > 0);
    const con = DockerMonitor.dockerInfo.containerInfo.find((x) => x.image.indexOf(this.name) > 0);
    const vol = DockerMonitor.dockerInfo.volumeInfo.find((x) => x.volume_name.indexOf(this.name) > 0);

    if (!rep || !vol || !con) {
      return null;
    }

    const resList = [];

    resList.push(new PerformanceMetrics(`docker.${this.name}.volume`, `size`, round(vol.size / (1024 * 1024.0), 3), "MB", vol.volume_name));

    resList.push(new PerformanceMetrics(`docker.${this.name}.container`, `size`, round(rep.size / (1024 * 1024.0), 1), "MB", con.image));

    if (con.status.indexOf("Up ") === 0) {
      const status = /(\S+) (\d+) (\S+)/.exec(con.status);
      resList.push(new PerformanceMetrics(`docker.${this.name}.container`, `status`, parseInt(status[2]), status[3], "up"));
    } else {
      resList.push(new PerformanceMetrics(`docker.${this.name}.container`, `status`, 0, "", "down"));
    }

    return resList;
  }

  async getMonitorStatus(): Promise<MonitorStatus> {
    return null;
  }
}
