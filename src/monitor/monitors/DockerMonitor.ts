import { ChainType, MCC, optional } from "@flarenetwork/mcc";
import * as fs from "fs";
import { round } from "../../utils/helpers/utils";
import { AttLogger } from "../../utils/logging/logger";
import { DockerInfo } from "../../utils/monitoring/Docker";
import { MonitorBase, MonitorStatus, PerformanceMetrics } from "../MonitorBase";
import { MonitorConfigBase } from "../MonitorConfigBase";
import { MonitorConfig } from "../MonitorConfiguration";

/**
 * Docker monitor configuration class.
 */
export class MonitorDockerConfig extends MonitorConfigBase {
  @optional() path: string = "../stats/docker_stats.json";

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
  dockerInfo: DockerInfo;

  chainType: ChainType;

  async initialize() {
    this.chainType = MCC.getChainType(this.config.name);
  }

  async getMonitorStatus(): Promise<MonitorStatus> {
    const res = new MonitorStatus();
    res.type = "container";
    res.name = this.name;

    const data = fs.readFileSync(this.config.path).toString();
    this.dockerInfo = JSON.parse(data) as DockerInfo;

    if (!this.dockerInfo) {
      return res;
    }

    const containerInfo = this.dockerInfo.containers.find((x) => x.name == this.name);

    if (!containerInfo) {
      return res;
    }

    if (containerInfo.status == "running") {
      res.status = "running";
    }

    return res;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    if (!this.dockerInfo) return null;

    const containerInfo = this.dockerInfo.containers.find((x) => x.name == this.name);

    if (!containerInfo) {
      return null;
    }

    const resList = [];

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `volume_size`, round(containerInfo.imageDiskUsage / (1024 * 1024.0), 1), "MB"));

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `size`, round(containerInfo.diskUsage / (1024 * 1024.0), 1), "MB"));

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `cpu_usage`, containerInfo.cpuUsage, "%"));
    resList.push(new PerformanceMetrics(`docker.${this.name}`, `mem_usage`, round(containerInfo.memUsage / (1024 * 1024.0), 1), "MB"));

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `io_wr_size`, round(containerInfo.diskIoWriteBytes / (1024 * 1024.0), 1), "MB"));
    resList.push(new PerformanceMetrics(`docker.${this.name}`, `io_rd_size`, round(containerInfo.diskIoReadBytes / (1024 * 1024.0), 1), "MB"));
    resList.push(new PerformanceMetrics(`docker.${this.name}`, `io_wr_op`, containerInfo.diskIoWrite));
    resList.push(new PerformanceMetrics(`docker.${this.name}`, `io_rd_op`, containerInfo.diskIoRead));

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `network_tx_op`, containerInfo.networkTx));
    resList.push(new PerformanceMetrics(`docker.${this.name}`, `network_rx_op`, containerInfo.networkRx));

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `status`, containerInfo.status == "running" ? 1 : 0));

    resList.push(new PerformanceMetrics(`docker.${this.name}`, `restartCount`, containerInfo.restartCount));

    return resList;
  }
}
