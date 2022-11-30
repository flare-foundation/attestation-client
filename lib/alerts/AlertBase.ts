import { Managed } from "@flarenetwork/mcc";
import { AttLogger, logException } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";

export class AlertStatus {
  type = "unknown";
  name = "";
  status: "down" | "late" | "sync" | "running" | "waiting" = "down";
  state = "";
  comment = "";
  timeLate: number;
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
    logger.info(`${this.type.padEnd(20)}  ${this.name.padEnd(20)}  ${color} ${this.status.padEnd(10)} ^^  ${this.state.padEnd(10)} ^B${this.comment}                  `);
  }
}

@Managed()
export class PerformanceInfo {
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

  displayStatus(logger: AttLogger) {
    logger.info(
      `${this.name.padEnd(20)}  ${this.valueName.padEnd(14)}  ${this.value.toString().padStart(10)} ${this.valueUnit.padEnd(5)} ^B${
        this.comment
      }                  `
    );
  }
}

export class AlertRestartConfig {
  time = 0;
  command = "";

  constructor(time: number, command: string) {
    this.time = time;
    this.command = command;
  }
}

const MIN_RESTART_TIME = 60;

@Managed()
export class AlertBase {
  restartConfig: AlertRestartConfig;

  logger: AttLogger;

  name: string;
  timeLastRestart = 0;

  static restartEnabled = true;

  constructor(name: string, logger: AttLogger, restart: AlertRestartConfig) {
    this.name = name;
    this.logger = logger;
    this.restartConfig = restart;
  }

  async initialize?();

  async check?(): Promise<AlertStatus>;
  async perf?(): Promise<PerformanceInfo[]>;
  async restart(): Promise<boolean> {
    if (!AlertBase.restartEnabled) return false;

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

    const { exec } = require("child_process");

    exec(command, (error, stdout, stderr) => {
      if (error) {
        logException(`exec '${command}'`, error);
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
