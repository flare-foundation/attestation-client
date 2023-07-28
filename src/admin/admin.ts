import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { MonitorBase } from "../monitor/MonitorBase";
import { MonitorManager } from "../monitor/MonitorManager";
import { getGlobalLogger, setLoggerName } from "../utils/logging/logger";
import { EServiceStatus } from "../utils/monitoring/EServiceStatus";
import { sleepMs } from "../utils/helpers/utils";
import { Menu } from "./menu";
import { MenuItemCommand } from "./menuItemCommand";
import { MenuItemLog } from "./menuItemLog";
import { MenuItemService } from "./menuItemService";

async function admin() {
  traceManager.displayStateOnException = false;
  traceManager.displayRuntimeTrace = false;
  TraceManager.enabled = false;

  const menu = new Menu();

  menu.addCommand("Update", "bash ./scripts/direct-install/.sh");
  menu
    .addSubmenu("Deploy")
    .addCommand("^RAll", "bash ./scripts/direct-install/deploy-all.sh")
    .parent()
    .addCommand("Indexers", "bash ./scripts/direct-install/deploy-indexer")
    .parent()
    .addCommand("Alerts", "bash ./scripts/direct-install/deploy-alerts")
    .parent()
    .addCommand("Coston Attestation Client", "bash ./scripts/direct-install/deploy-coston-attester")
    .parent()
    .addCommand("Coston webserver", "bash ./scripts/direct-install/deploy-coston-webserver")
    .parent()
    .addCommand("Songbird Attestation Client", "bash ./scripts/direct-install/deploy-songbird-attester")
    .parent()
    .addCommand("Songbird webserver", "bash ./scripts/direct-install/deplay-songbird-webserver");

  menu
    .addSubmenu("Services")
    .addCommand("^RRestart all", "bash ./scripts/direct-install/services-restart-all")
    .parent()
    .addCommand("^RStop all", "bash ./scripts/direct-install/services-stop-all")
    .parent()
    .addSubmenu("Indexer")
    .addService("ALGO", "indexer-algo")
    .parent()
    .addService("BTC", "indexer-btc")
    .parent()
    .addService("DOGE", "indexer-doge")
    .parent()
    .addService("LTC", "indexer-ltc")
    .parent()
    .addService("XRP", "indexer-xrp")
    .parent()
    .parent()
    .addService("Alerts", "attester-alerts")
    .parent()
    .addService("Coston Attestation Client", "coston-attester-client")
    .parent()
    .addService("Coston webserver", "coston-webserver")
    .parent()
    .addService("Songbird Attestation Client", "songbird-attester-client")
    .parent()
    .addService("Songbird webserver", "songbird-webserver").parent;

  menu
    .addSubmenu("Show log")
    .addSubmenu("Indexer")
    .addLog("ALGO", "../global/indexer/logs/attester-ALGO.log")
    .parent()
    .addLog("BTC", "../global/indexer/logs/attester-BTC.log")
    .parent()
    .addLog("DOGE", "../global/indexer/logs/attester-DOGE.log")
    .parent()
    .addLog("LTC", "../global/indexer/logs/attester-LTC.log")
    .parent()
    .addLog("XRP", "../global/indexer/logs/attester-XRP.log")
    .parent()
    .parent()
    .addLog("app", "logs/attester-global.log")
    .parent()
    .addLog("Alerts", "../global/alerts/logs/attester-global.log")
    .parent()
    .addLog("Coston Attestation Client", "../coston/attester-client/logs/attester-global.log")
    .parent()
    .addLog("Coston webserver", "../coston/webserver/logs/attester-global.log")
    .parent()
    .addLog("Songbird Attestation Client", "../songbird/attester-client/logs/attester-global.log")
    .parent()
    .addLog("Songbird webserver", "../songbird/webserver/logs/attester-global.log").parent;

  menu
    .addSubmenu("Reset Database")
    .addCommand("ALGO", "bash ./scripts/direct-install/helpers/indexer-reset-algo.sh")
    .parent()
    .addCommand("BTC", "bash ./scripts/direct-install/helpers/indexer-reset-btc.sh")
    .parent()
    .addCommand("DOGE", "bash ./scripts/direct-install/helpers/indexer-reset-doge.sh")
    .parent()
    .addCommand("LTC", "bash ./scripts/direct-install/helpers/indexer-reset-ltc.sh")
    .parent()
    .addCommand("XRP", "bash ./scripts/direct-install/helpers/indexer-reset-xrp.sh")
    .parent();

  //await menu.run();

  // eslint-disable-next-line
  Menu.startInputRead();

  // initialize alerts
  MonitorBase.restartEnabled = false;
  const monitorManager = new MonitorManager();
  for (const alert of monitorManager.monitors) {
    await alert!.initialize();
  }

  let resAlerts = [];
  let resPerfs = [];

  const logger = getGlobalLogger();

  menu.onDisplay = () => {
    logger.info(`^E System Monitor                                    `);
    for (const resAlert of resAlerts) {
      resAlert.displayStatus(logger);
    }
    logger.info(`                                                  `);
    logger.info(`^E Performance Monitor                              `);
    for (const resPerf of resPerfs) {
      resPerf.displayStatus(logger);
    }

    logger.info(`                                                  `);
    logger.info(`^E Services                                       `);
    for (const service of MenuItemService.servicemMonitors) {
      let color = "^y^K";
      switch (service.status) {
        case EServiceStatus.inactive:
          color = "^r^W";
          break;
        case EServiceStatus.failed:
          color = "^b^W";
          break;
        case EServiceStatus.active:
          color = "^g^K";
          break;
      }

      logger.info(`${service.name.padEnd(30)}  ${color} ${EServiceStatus[service.status].padEnd(10)} ^^  ^B${service.comment}                              `);
    }

    logger.info(`                                                  `);
  };

  menu.display(true);

  while (!menu.done) {
    // update alerts
    resAlerts = [];
    for (const alert of monitorManager.monitors) {
      try {
        const resAlert = await alert.getMonitorStatus();

        if (!resAlert) continue;

        resAlerts.push(resAlert);
      } catch (error) {}
    }

    resPerfs = [];
    for (const alert of monitorManager.monitors) {
      try {
        const resPerf = await alert.getPerformanceMetrics();

        if (!resPerf) continue;

        for (const i of resPerf) {
          resPerfs.push(i);
        }
      } catch (error) {}
    }

    // update menu
    menu.display();

    const key = await menu.waitForInputTimeout(5000);

    if (key) {
      menu.processInput(key);
    }

    // wait for execution to stop
    while (MenuItemCommand.working || MenuItemLog.working) {
      await sleepMs(100);
    }
  }
}

async function run() {
  await admin();
}

setLoggerName("admin");

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
