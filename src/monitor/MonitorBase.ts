import { Managed } from "@flarenetwork/mcc";
import { exec } from "child_process";
import { getUnixEpochTimestamp } from "../utils/helpers/utils";
import { AttLogger, logException } from "../utils/logging/logger";
import { MonitorConfig } from "./MonitorConfiguration";
import { MonitorConfigBase } from "./MonitorConfigBase";

/**
 * Monitor status.
 */
export class MonitorStatus {
  type = "unknown";
  name = "";
  status: "down" | "late" | "sync" | "running" | "waiting" = "down";
  state = "";
  comment = "";
  timeLate: number;

  /**
   * Display monitor status.
   * @param logger 
   */
  displayStatus(logger: AttLogger) {
    let color = "";
    switch (this.status) {
      case "down":
        color = "^r^W";
        break;
      case "late":
        color = "^b^W";
        break;
      case "sync":
        color = "^y^K";
        break;
      case "running":
        color = "^g^K";
        break;
    }
    logger.info(
      `${this.type.padEnd(20)}  ${this.name.padEnd(20)}  ${color} ${this.status.padEnd(10)} ^^  ${this.state.padEnd(10)} ^B${this.comment}                  `
    );
  }
}

/**
 * Performance metrics.
 */
@Managed()
export class PerformanceMetrics {
  name: string;
  valueName = "";
  value: number;
  valueUnit = "";
  comment = "";

  constructor(name: string, valueName: string, value: number, valueUnit = "", comment = "") {
    this.name = name;
    this.valueName = valueName;
    this.value = value;
    this.valueUnit = valueUnit;
    this.comment = comment;
  }

  /**
   * Display performance metrics status.
   * @param logger 
   */
  displayStatus(logger: AttLogger) {
    logger.info(
      `${this.name.padEnd(20)}  ${this.valueName.padEnd(14)}  ${this.value.toString().padStart(10)} ${this.valueUnit.padEnd(5)} ^B${
        this.comment
      }                  `
    );
  }
}

/**
 * Restart configuration.
 */
export class MonitorRestartConfig {
  time = 0;
  command = "";

  constructor(time: number, command: string) {
    this.time = time;
    this.command = command;
  }
}

const MIN_RESTART_TIME = 60;

/**
 * Monitor base class.
 */
@Managed()
export class MonitorBase<T extends MonitorConfigBase> {
  restartConfig: MonitorRestartConfig;

  config: T;
  baseConfig: MonitorConfig;

  logger: AttLogger;

  timeLastRestart = 0;

  static restartEnabled = true;

  constructor(config: T, baseConfig: MonitorConfig, logger: AttLogger) {
    this.config = config;
    this.baseConfig = baseConfig;
    this.logger = logger;
    this.restartConfig = new MonitorRestartConfig(config.timeRestart, config.restart);
  }

  /**
   * Get monitor name
   */
  get name() {
    return this.config.name;
  }

  /**
   * Initialize monitor.
   */
  async initialize?();

  /**
   * Get monitor status.
   */
  async getMonitorStatus?(): Promise<MonitorStatus>;

  /**
   * Return performance metrics.
   */
  async getPerformanceMetrics?(): Promise<PerformanceMetrics[]>;

  /**
   * Perform restart logic.
   * @returns true if restart was initiated.
   */
  async restart(): Promise<boolean> {
    if (!MonitorBase.restartEnabled) return false;

    if (!this.restartConfig || this.restartConfig.time <= 0) return false;

    // do not restart MIN_RESTART_TIME sec after if was just restarted
    const now = getUnixEpochTimestamp();
    if (now - this.timeLastRestart < MIN_RESTART_TIME) return false;

    this.timeLastRestart = now;

    //this.logger.error2( `restarting ${this.name}` );

    const command = this.restartConfig.command;

    if (!command) {
      this.logger.error(`${this.name} restart command not set`);
      return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logException(`exec '${command}'`, error + "");
        return;
      }
      if (stderr) {
        //console.log(`stderr: ${stderr}`);
        return;
      }
      //console.log(`stdout: ${stdout}`);
    });

    return true;
  }
}
