import * as http from "http";
import { getUnixEpochTimestamp } from "../../utils/helpers/utils";
import { AttLogger } from "../../utils/logging/logger";
import { MonitorBase, MonitorStatus } from "../MonitorBase";
import { MonitorConfig } from "../MonitorConfiguration";
import { MonitorConfigBase } from "../MonitorConfigBase";

/**
 * Url monitor configuration class.
 */
export class MonitorUrlConfig extends MonitorConfigBase {
  address = "";
  restart = "";

  getName() {
    return "UrlMonitor";
  }

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new UrlMonitor(<MonitorUrlConfig>config, baseConfig, logger);
  }
}

/**
 * Url monitor.
 */
export class UrlMonitor extends MonitorBase<MonitorUrlConfig> {
  async initialize() {}

  async checkWebsite(url) {
    return new Promise((resolve, reject) => {
      try {
        http
          .get(url, function (res) {
            resolve(res.statusCode === 200);
          })
          .on("error", function (e) {
            resolve(false);
          });
      } catch (error) {
        resolve(false);
      }
    });
  }

  async getPerformanceMetrics() {
    return null;
  }

  async getMonitorStatus(): Promise<MonitorStatus> {
    const res = new MonitorStatus();
    res.type = `backend`;
    res.name = this.name;
    res.comment = this.config.address;

    // check if address exists
    const resExists = await this.checkWebsite(this.config.address);

    const now = getUnixEpochTimestamp();

    //res.state = "";

    res.timeLate = now;

    if (resExists) {
      res.status = "running";
    } else {
      res.status = "down";
      // if (await this.restart()) {
      //   res.comment = "^r^Wrestart^^";
      // }
    }

    return res;
  }
}
