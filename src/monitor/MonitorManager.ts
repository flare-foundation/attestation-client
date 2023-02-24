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
import { Prometheus } from "./prometheus";

@Managed()
export class MonitorManager {
  logger: AttLogger;
  config: MonitorConfig;
  monitors: MonitorBase<MonitorConfigBase>[] = [];

  initializeMonitors<T extends MonitorConfigBase>(monitors: T[]) {
    for (const monitor of monitors) {
      this.logger.debug(`initializing: ${monitor.getName()} ${monitor.name} ${monitor.disabled ? "^rdisabled^^" : ""}`);
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

    this.initializeMonitors(this.config.dockers);
    this.initializeMonitors(this.config.nodes);
    this.initializeMonitors(this.config.indexers);
    this.initializeMonitors(this.config.attesters);
    this.initializeMonitors(this.config.backends);
    this.initializeMonitors(this.config.databases);

    for (const monitor of this.monitors) {
      await monitor.initialize();
    }
  }

  async runMonitor() {
    traceManager.displayStateOnException = false;
    traceManager.displayRuntimeTrace = false;

    // initialize monitors
    await this.initialize();

    const terminal = new Terminal(process.stderr);
    //terminal.cursor(false);

    this.logger.info(`^e^K${"type".padEnd(20)}  ${"name".padEnd(20)}  ${"status".padEnd(10)}    ${"message".padEnd(10)} comment                        `);

    terminal.cursorSave();

    // create prometheus registry and pushgateway
    const prefix = 'attestationsuite';

    const prometheus = new Prometheus(this.logger);
    prometheus.connectPushgateway('http://127.0.0.1:9091');

    while (true) {
      // monitoring
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

            var status = 0;
            switch (resAlert.status) {
              case 'down': status = 0; break;
              case 'late': status = 1; break;
              case 'sync': status = 2; break;
              case 'running': status = 3; break;
            }

            prometheus.setGauge(`${prefix}_${monitor.name}_${resAlert.type}`,
              resAlert.comment,
              resAlert.status,
              status);

          } catch (error) {
            logException(error, `monitor ${monitor.name}`);
          }
        }

        for (const monitor of this.monitors) {
          try {
            const resPerfs = await monitor.perf();

            if (!resPerfs) continue;

            for (const perf of resPerfs) {
              statusPerfs.push(perf);
              perf.displayStatus(this.logger);

              prometheus.setGauge(`${prefix}_${perf.name}_${perf.valueName}_${perf.valueUnit}`,
                perf.valueName,
                perf.valueUnit,
                perf.value);
            }
          } catch (error) {
            logException(error, `perf ${monitor.name}`);
          }
        }

        // save monitoring state to a file
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
        logException(error, `runMonitor`);
      }

      // push metric to gateway 
      prometheus.push(prefix);

      await sleepms(this.config.interval);
    }
  }
}
