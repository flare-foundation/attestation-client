import { execSync } from "child_process";
import { exit } from "process";
import { getSecureValue, initializeJSONsecure, readFileSecure } from "../utils/config/jsonSecure";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logging/logger";
import { sleepms } from "../utils/helpers/utils";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

async function run() {
  const logger = getGlobalLogger();
  // read configuration
  await initializeJSONsecure(DEFAULT_SECURE_CONFIG_PATH, "Coston");

  const installLines = readFileSecure("configs/.install/templates/sql/install.sql").split(/\r?\n/);
  const updateLines = readFileSecure("configs/.install/templates/sql/update.sql").split(/\r?\n/);

  for (var line of installLines) {
    try {
      const command = `sudo mysql -e "${line}"`;
      logger.debug(command);
      execSync(command, { windowsHide: true, encoding: "buffer" });
    } catch (error) {
      logger.error(error);
    }
  }

  for (var line of updateLines) {
    try {
      const command = `sudo mysql -e "${line}"`;
      logger.debug(command);
      execSync(command, { windowsHide: true, encoding: "buffer" });
    } catch (error) {
      logger.error(error);
    }
  }
}

const instanceName = `secureUpdateSql`;
// set all global loggers to the chain
setLoggerName(instanceName);
setGlobalLoggerLabel(instanceName);

// allow only one instance of the application

const SingleInstance = require("single-instance");
const locker = new SingleInstance(instanceName);

locker
  .lock()
  .then(function () {
    // entry point
    run()
      .then(() => process.exit(0))
      .catch((error) => {
        logException(error, `secureUpdateSql`);
        process.exit(1);
      });
  })
  .catch(function (err) {
    getGlobalLogger().error(`unable to start application. ^w${instanceName}^^ is locked`);
    // Quit the application
    exit(2);
  });
