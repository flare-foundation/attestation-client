import { Managed, traceManager } from "@flarenetwork/mcc";
import { readConfig } from "../utils/config";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { Terminal } from "../utils/terminal";
import { sleepms } from "../utils/utils";
import { AlertBase, AlertRestartConfig } from "./AlertBase";
import { AlertConfig } from "./AlertsConfiguration";
import { AttesterAlert } from "./AttestationAlert";
import { BackendAlert } from "./BackendAlert";
import { DatabaseAlert } from "./DatabaseAlert";
import { DockerAlert } from "./DockerAlert";
import { IndexerAlert } from "./IndexerAlert";
import { NodeAlert } from "./NodeAlert";
import { stringify } from "safe-stable-stringify";

@Managed()
export class AlertsManager {
  logger: AttLogger;
  config: AlertConfig;

  alerts: AlertBase[] = [];

  constructor() {
    this.logger = getGlobalLogger();

    this.config = readConfig(new AlertConfig(), "alerts");

    for (const node of this.config.nodes) {
      this.alerts.push(new NodeAlert(node, this.logger, this.config));
    }

    for (const docker of this.config.dockers) {
      this.alerts.push(new DockerAlert(docker, this.logger, this.config));
    }

    for (const indexer of this.config.indexers) {
      this.alerts.push(new IndexerAlert(indexer, this.logger, this.config));
    }

    for (const attester of this.config.attesters) {
      this.alerts.push(
        new AttesterAlert(attester.name, this.logger, attester.mode, attester.path, new AlertRestartConfig(this.config.timeRestart, attester.restart))
      );
    }

    for (const backend of this.config.backends) {
      this.alerts.push(new BackendAlert(backend.name, this.logger, new AlertRestartConfig(this.config.timeRestart, backend.restart), backend.address));
    }

    for (const database of this.config.databases) {
      this.alerts.push(new DatabaseAlert(database.name, this.logger, database.database, database.connection));
    }
  }

  async runAlerts() {
    traceManager.displayStateOnException = false;
    traceManager.displayRuntimeTrace = false;

    for (const alert of this.alerts) {
      await alert.initialize();
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

        for (const alert of this.alerts) {
          try {
            const resAlert = await alert.check();

            if (!resAlert) continue;

            statusAlerts.push(resAlert);

            resAlert.displayStatus(this.logger);
          } catch (error) {
            logException(error, `alert ${alert.name}`);
          }
        }

        for (const alert of this.alerts) {
          try {
            const resPerfs = await alert.perf();

            if (!resPerfs) continue;

            for (const perf of resPerfs) {
              statusPerfs.push(perf);
              perf.displayStatus(this.logger);
            }
          } catch (error) {
            logException(error, `perf ${alert.name}`);
          }
        }

        if (this.config.stateSaveFilename) {
          try {
            const fs = require("fs");
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
