import { AttLogger } from "../utils/logging/logger";
import { getUnixEpochTimestamp } from "../utils/helpers/utils";
import { MonitorBase, MonitorRestartConfig, MonitorStatus } from "./MonitorBase";

export class WebserverMonitor extends MonitorBase {
  address: string;

  constructor(name: string, logger: AttLogger, config: MonitorRestartConfig, address: string) {
    super(name, logger, config);

    this.address = address;
  }

  async initialize() {}

  async checkWebsite(url) {
    const http = require("http");

    return new Promise((resolve, reject) => {
      http
        .get(url, function (res) {
          //console.log(url, res.statusCode);
          resolve(res.statusCode === 200);
        })
        .on("error", function (e) {
          resolve(false);
        });
    });
  }

  async perf() {
    return null;
  }

  async check(): Promise<MonitorStatus> {
    const res = new MonitorStatus();
    res.type = `backend`;
    res.name = this.name;

    // check if address exists
    const resExists = await this.checkWebsite(this.address);

    const now = getUnixEpochTimestamp();

    //res.state = "";

    res.timeLate = now;

    if (resExists) {
      res.status = "running";
    } else {
      res.status = "down";
      if (await this.restart()) {
        res.comment = "^r^Wrestart^^";
      }
    }

    return res;
  }
}
