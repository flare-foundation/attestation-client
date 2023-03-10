/**
 * - Add prometheus server
 * - Add indexer bottom top - block count
 * - Add indexer bottom top - sec count
 * - comment classes
 */

import { Managed, traceManager } from "@flarenetwork/mcc";
import stringify from "safe-stable-stringify";
import { runMonitorserver } from "../servers/monitor-server/src/monitorserver";
import { readSecureConfig } from "../utils/config/configSecure";
import { sleepms } from "../utils/helpers/utils";
import { AttLogger, getGlobalLogger, logException } from "../utils/logging/logger";
import { Terminal } from "../utils/monitoring/Terminal";
import { MonitorBase } from "./MonitorBase";
import { MonitorConfigBase } from "./MonitorConfigBase";
import { MonitorConfig } from "./MonitorConfiguration";
import { SystemMonitor } from "./monitors/SystemMonitor";
import { Prometheus } from "./prometheus";

let prometheus: Prometheus;
let statusJson: string = "";
let statusObject;

export async function getPrometheusMetrics(): Promise<string> {
  return await prometheus.getMetrics();
}

export async function getStatusJson(): Promise<string> {
  return statusJson;
}

export async function getStatusObject(): Promise<string> {
  return statusObject;
}

/**
 * Monitor manager.
 */
@Managed()
export class MonitorManager {
  logger: AttLogger;
  config: MonitorConfig;
  monitors: MonitorBase<MonitorConfigBase>[] = [];

  /**
   * Initialize monitors.
   * @param monitors 
   */
  initializeMonitors<T extends MonitorConfigBase>(monitors: T[]) {
    for (const monitor of monitors) {
      this.logger.debug(`initializing: ${monitor.getName()} ${monitor.name} ${monitor.disabled ? "^rdisabled^^" : ""}`);
      if (monitor.disabled) continue;

      this.monitors.push(monitor.createMonitor(monitor, this.config, this.logger));
    }
  }

  /**
   * Initialize monitor manager.
   */
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

  /**
   * Async run monitor.
   */
  async runMonitor() {
    traceManager.displayStateOnException = false;
    traceManager.displayRuntimeTrace = false;

    // initialize monitors
    await this.initialize();

    if (this.config.prometheus.monitorServerEnabled) {
      runMonitorserver();
    }

    const terminal = new Terminal(process.stderr);
    //terminal.cursor(false);

    this.logger.info(
      `^e^K${"type".padEnd(20)}  ${"name".padEnd(20)}  ${"status".padEnd(10)}    ${"message".padEnd(10)} comment                                        `
    );

    terminal.cursorSave();

    // create prometheus registry and pushgateway
    const prefix = "attestationsuite";

    prometheus = new Prometheus(this.logger);

    if (this.config.prometheus.pushGatewayEnabled) {
      prometheus.connectPushgateway(this.config.prometheus.pushGatewayUrl);
    }

    while (true) {
      // monitoring
      try {
        terminal.cursorRestore();

        const statusMonitors = [];
        const statusPerfs = [];

        for (const monitor of this.monitors) {
          try {
            const resAlert = await monitor.getMonitorStatus();

            if (!resAlert) continue;

            statusMonitors.push(resAlert);

            resAlert.displayStatus(this.logger);

            var status = 0;
            switch (resAlert.status) {
              case "down":
                status = 0;
                break;
              case "late":
                status = 1;
                break;
              case "sync":
                status = 2;
                break;
              case "running":
                status = 3;
                break;
            }

            prometheus.setGauge(`${prefix}_${monitor.name}_${resAlert.type}`, resAlert.comment, resAlert.status, status);
          } catch (error) {
            logException(error, `monitor ${monitor.name}`);
          }
        }

        for (const monitor of this.monitors) {
          try {
            const resPerfs = await monitor.getPerformanceMetrics();

            if (!resPerfs) continue;

            for (const perf of resPerfs) {
              statusPerfs.push(perf);
              perf.displayStatus(this.logger);

              prometheus.setGauge(`${prefix}_${perf.name}_${perf.valueName}_${perf.valueUnit}`, perf.valueName, perf.valueUnit, perf.value);
            }
          } catch (error) {
            logException(error, `perf ${monitor.name}`);
          }
        }

        // save status to json string
        statusObject = { monitor: statusMonitors, perf: statusPerfs };
        statusJson = stringify(statusObject);
      } catch (error) {
        logException(error, `runMonitor`);
      }

      if (this.config.prometheus.pushGatewayEnabled) {
        // push metric to gateway
        prometheus.push(prefix);
      }

      await sleepms(this.config.interval);
    }
  }
}
