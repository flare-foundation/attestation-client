import { ChainType, MCC } from "@flarenetwork/mcc";
import { Docker, DockerInfo } from "../utils/Docker";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger } from "../utils/logger";
import { round } from "../utils/utils";
import { AlertBase, AlertRestartConfig, AlertStatus, PerformanceInfo } from "./AlertBase";
import { AlertConfig } from "./AlertsConfiguration";

export class DockerAlert extends AlertBase {
  static dockerInfo: DockerInfo;

  timeCheck = 0;

  chainType: ChainType;

  constructor(name: string, logger: AttLogger, config: AlertConfig) {
    super(name, logger, new AlertRestartConfig(config.timeRestart, config.indexerRestart.replace("<name>", name).toLowerCase()));

    this.chainType = MCC.getChainType(name);
  }

  async initialize() {}

  async perf(): Promise<PerformanceInfo[]> {
    const now = getTimeMilli();
    if (now > this.timeCheck) {
      DockerAlert.dockerInfo = Docker.getDockerInfo();

      // check once per 10 minutes
      this.timeCheck = now + 60 * 10 * 1000;
    }

    if (!DockerAlert.dockerInfo) return null;

    const rep = DockerAlert.dockerInfo.repositoryInfo.find((x) => x.repository.indexOf(this.name) > 0);
    const con = DockerAlert.dockerInfo.containerInfo.find((x) => x.image.indexOf(this.name) > 0);
    const vol = DockerAlert.dockerInfo.volumeInfo.find((x) => x.volume_name.indexOf(this.name) > 0);

    if (!rep || !vol || !con) {
      return null;
    }

    const resList = [];

    resList.push(new PerformanceInfo(`docker.${this.name}.volume`, `size`, round(vol.size / (1024 * 1024 * 1024.0), 3), "GB", vol.volume_name));

    resList.push(new PerformanceInfo(`docker.${this.name}.container`, `size`, round(rep.size / (1024 * 1024 * 1024.0), 1), "GB", con.image));

    if (con.status.indexOf("Up ") === 0) {
      const status = /(\S+) (\d+) (\S+)/.exec(con.status);
      resList.push(new PerformanceInfo(`docker.${this.name}.container`, `status`, parseInt(status[2]), status[3], "up"));
    } else {
      resList.push(new PerformanceInfo(`docker.${this.name}.container`, `status`, 0, "", "down"));
    }

    return resList;
  }

  async check(): Promise<AlertStatus> {
    return null;
  }
}
