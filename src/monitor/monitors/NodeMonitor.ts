import { ChainType, MCC, RateLimitOptions } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptions } from "../../caching/CachedMccClient";
import { AttLogger, logException } from "../../utils/logging/logger";
import { MonitorBase, MonitorStatus } from "../MonitorBase";
import { MonitorConfig } from "../MonitorConfiguration";
import { MonitorConfigBase } from "../MonitorConfigBase";

export class MonitorNodeConfig extends MonitorConfigBase {
  url = "";
  username = "";
  password = "";

  getName() {
    return "NodeMonitor";
  }

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new NodeMonitor(<MonitorNodeConfig>config, baseConfig, logger);
  }
}

export class NodeMonitor extends MonitorBase<MonitorNodeConfig> {
  chainType: ChainType;

  cachedClient: CachedMccClient;

  async initialize() {
    this.chainType = MCC.getChainType(this.name);

    // todo: setup options from config
    const cachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: {
        url: this.config.url,
        username: this.config.username,
        password: this.config.password,
        rateLimitOptions: new RateLimitOptions(),
        loggingOptions: {
          mode: "production",
          loggingCallback: this.mccLogging.bind(this),
          warningCallback: this.mccWarning.bind(this),
          exceptionCallback: this.mccException.bind(this),
        },
      },
    };

    try {
      this.cachedClient = new CachedMccClient(this.chainType, cachedMccClientOptions);
    } catch (error) {
      logException(error, `node ${this.chainType}`);
    }
  }

  mccLogging(message: string) {
    //this.logger.info(`MCC ${message}`);
  }

  mccWarning(message: string) {
    this.logger.warning(`MCC ${message}`);
  }

  mccException(error: any, message: string) {
    logException(error, message);
  }

  async perf() {
    return null;
  }

  async check(): Promise<MonitorStatus> {
    const res = new MonitorStatus();
    res.type = `node`;
    res.name = this.name;

    if (!this.cachedClient) {
      res.status = "down";
      res.state = "";
      res.comment = `unable to connect ${this.config.url}`;
      return res;
    }

    const status = await this.cachedClient.client.getNodeStatus();

    if (!status) {
      res.comment = "node status not available";
      return res;
    }

    res.state = ``;
    res.comment = `state ${status?.state}, version ${status?.version}`;

    if (status.isHealthy && status.isSynced) {
      res.status = "running";
    } else if (status.isHealthy && !status.isSynced) {
      res.status = "sync";
    } else if (!status.isHealthy) {
      res.status = "down";
    }

    // if (late > this.restartConfig.time) {
    //     if (await this.restart()) {
    //         res.comment = "^r^Wrestart^^";
    //     }
    // }

    return res;
  }
}
