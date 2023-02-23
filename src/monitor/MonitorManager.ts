import { Managed, traceManager } from "@flarenetwork/mcc";
import fs from "fs";
import { stringify } from "safe-stable-stringify";
import { readSecureConfig } from "../utils/config/configSecure";
import { sleepms } from "../utils/helpers/utils";
import { AttLogger, getGlobalLogger, logException } from "../utils/logging/logger";
import { Terminal } from "../utils/monitoring/Terminal";
import { MonitorBase } from "./MonitorBase";
import { MonitorConfigBase } from "./MonitorConfigBase";
import { MonitorConfig } from "./MonitorConfiguration";
import { SystemMonitor } from "./monitors/SystemMonitor";

@Managed()
export class MonitorManager {
  logger: AttLogger;
  config: MonitorConfig;
  monitors: MonitorBase<MonitorConfigBase>[] = [];

  initializeMonitors<T extends MonitorConfigBase>(name: string, monitors: T[]) {
    for (const monitor of monitors) {
      this.logger.debug(`initializing: ${name} ${monitor.name} ${monitor.disabled ? "^rdisabled^^" : ""}`);
      if (monitor.disabled) continue;

      this.monitors.push(monitor.createMonitor(monitor, this.config, this.logger));
    }
  }

  async initialize() {
    this.logger = getGlobalLogger();

    process.env.SECURE_CONFIG_PATH = "deployment/credentials";

    this.config = await readSecureConfig(new MonitorConfig(), "monitor");

    if (this.config.system) {
      this.logger.debug("initializing: SystemMonitor");
      this.monitors.push(new SystemMonitor(new MonitorConfigBase(), this.config, this.logger));
    }

    this.initializeMonitors("DockerMonitor", this.config.dockers);
    this.initializeMonitors("NodeMonitor", this.config.nodes);
    this.initializeMonitors("IndexerMonitor", this.config.indexers);
    this.initializeMonitors("AttesterMonitor", this.config.attesters);
    this.initializeMonitors("UrlMonitor", this.config.backends);
    this.initializeMonitors("DatabaseMonitor", this.config.databases);
  }

  async runMonitor() {
    traceManager.displayStateOnException = false;
    traceManager.displayRuntimeTrace = false;

    await this.initialize();

    for (const monitor of this.monitors) {
      await monitor.initialize();
    }

    const terminal = new Terminal(process.stderr);
    //terminal.cursor(false);

    this.logger.info(`^e^K${"type".padEnd(20)}  ${"name".padEnd(20)}  ${"status".padEnd(10)}    ${"message".padEnd(10)} comment                        `);

    terminal.cursorSave();

    while (true) {
      try {
        terminal.cursorRestore();

        const statusAlerts = [];
        const statusPerfs = [];

        for (const monitor of this.monitors) {
          try {
            const resAlert = await monitor.check();

            if (!resAlert) continue;

            statusAlerts.push(resAlert);

            resAlert.displayStatus(this.logger);
          } catch (error) {
            logException(error, `alert ${monitor.name}`);
          }
        }

        for (const monitor of this.monitors) {
          try {
            const resPerfs = await monitor.perf();

            if (!resPerfs) continue;

            for (const perf of resPerfs) {
              statusPerfs.push(perf);
              perf.displayStatus(this.logger);
            }
          } catch (error) {
            logException(error, `perf ${monitor.name}`);
          }
        }

        if (this.config.stateSaveFilename) {
          try {
            fs.writeFile(this.config.stateSaveFilename, stringify({ alerts: statusAlerts, perf: statusPerfs }), function (err) {
              if (err) {
                this.logger.error(err);
              }
            });
          } catch (error) {
            logException(error, `save state`);
          }
        }
      } catch (error) {
        logException(error, `runAlerts`);
      }

      await sleepms(this.config.interval);
    }
  }
}
