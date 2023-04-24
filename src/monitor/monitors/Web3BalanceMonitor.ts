import { optional } from "@flarenetwork/mcc";
import Web3 from "web3";
import { round } from "../../utils/helpers/utils";
import { getWeb3, weiToDecimal } from "../../utils/helpers/web3-utils";
import { AttLogger, getGlobalLogger } from "../../utils/logging/logger";
import { MonitorBase, MonitorStatus, PerformanceMetrics } from "../MonitorBase";
import { MonitorConfigBase } from "../MonitorConfigBase";
import { MonitorConfig } from "../MonitorConfiguration";

/**
 * Web3Balance monitor configuration class.
 */
export class Web3BalanceConfig extends MonitorConfigBase {
  address: string = "0x00000000000000000000";

  @optional() web3Rpc: string = "https://flare-api.flare.network/ext/C/rpc";

  @optional() currency = "FLR";

  @optional() lowBalanceErrorThreshold = 100;

  getName() {
    return "Web3BalanceMonitor";
  }

  createMonitor(config: MonitorConfigBase, baseConfig: MonitorConfig, logger: AttLogger) {
    return new Web3BalanceMonitor(<Web3BalanceConfig>config, baseConfig, logger);
  }
}

/**
 * Web3Balance monitor.
 */
export class Web3BalanceMonitor extends MonitorBase<Web3BalanceConfig> {
  logger: AttLogger;
  web3!: Web3;
  balance: bigint;

  async initialize() {
    this.logger = getGlobalLogger();

    if (this.config.address === "") {
      this.logger.error(`web3Balance ${this.config.name} address not specified. Balance will not be reported.`);
      return;
    }

    this.web3 = getWeb3(this.config.web3Rpc);
  }

  async getMonitorStatus(): Promise<MonitorStatus> {
    if (!this.web3) return null;

    const res = new MonitorStatus();
    res.type = "web3Balance";
    res.name = this.name;

    const balanceWei = await this.web3.eth.getBalance(this.config.address);

    if (!balanceWei) {
      return res;
    }

    this.balance = weiToDecimal(BigInt(balanceWei));

    if (this.balance > this.config.lowBalanceErrorThreshold) {
      res.status = "running";
    } else {
      res.status = "down";
    }

    return res;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    const resList = [];

    resList.push(new PerformanceMetrics(`web3.${this.name}`, `balance`, round(Number(this.balance), 2), this.config.currency));

    return resList;
  }
}
