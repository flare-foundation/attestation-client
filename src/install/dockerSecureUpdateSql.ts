import { execSync } from "child_process";
import fs from "fs";
import { exit } from "process";
import * as yargs from "yargs";
import { getSecureValue, initializeJSONsecure, _prepareSecureData } from "../utils/config/jsonSecure";
import { sleepms } from "../utils/helpers/utils";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logging/logger";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

const args = yargs
  .option("defaultSecureConfigPath", {
    alias: "p",
    type: "string",
    description: "default secure config path",
    default: DEFAULT_SECURE_CONFIG_PATH,
    demand: false,
  })
  .option("input", { alias: "i", type: "string", description: "input file", default: DEFAULT_SECURE_CONFIG_PATH, demand: true })
  .option("chain", { alias: "n", type: "string", description: "node name", default: "", demand: false })
  .option("sudo", { alias: "s", type: "boolean", description: "sudo mysql mode", default: false, demand: false })
  .option("network", { alias: "e", type: "string", description: "network", default: "Coston", demand: false }).argv;

async function run() {
  const logger = getGlobalLogger();

  const inputFile = args["input"];
  const nodeName = args["chain"].toUpperCase();
  const sudo = args["sudo"];

  if (nodeName != "") {
    logger.info(`^gstarting MYSQL script ^r${inputFile}^g for node ^r${nodeName}`);
  } else {
    logger.info(`^gstarting MYSQL script ^r${inputFile}^^`);
  }

  if (sudo) {
    logger.debug(`sudo mode`);
  }

  // read configuration
  await initializeJSONsecure(args["defaultSecureConfigPath"], args["network"]);

  const inputFilename = `configs/.install/templates/sql/${inputFile}.sql`;

  const data = fs.readFileSync(inputFilename).toString();
  const scriptLines = (await _prepareSecureData(data, inputFilename, nodeName, `Chain`)).split(/\r?\n/);

  // get secure DatabaseRootPassword
  const secureRootPassword = getSecureValue(`DatabaseRootPassword`);

  // wait for database
  let connected = false;
  let password = "";

  for (let retry = 0; retry < 60; retry++) {
    try {
      const secureLogin = (retry & 1) === 0;
      password = secureLogin ? secureRootPassword : process.env.MYSQL_ROOT_PASSWORD;
      const command = sudo ? `sudo mysql -e ";"` : `mysql -h database -u root -p${password} -e ";"`;

      //logger.debug(muteMySQLPasswords(command));
      logger.debug(`connecting to database ${retry}`);

      execSync(command, { windowsHide: true, encoding: "buffer", stdio: "ignore" });
      connected = true;
      if (secureLogin) {
        logger.info(`mysql connected with secure password`);
        if (!process.env.UPDATE_MYSQL) {
          logger.info(`mysql already setup. exiting.`);
          logger.debug(`(use env UPDATE_MYSQL=1 to force update)`);
          return;
        }
        logger.debug(`force update (UPDATE_MYSQL exists)`);
      } else {
        logger.info(`mysql connected with ENV password`);
      }
      break;
    } catch (error) {
      logger.error(`unable to connect to database (waiting)`);
      //logger.exception(muteMySQLPasswords(error.message));
    }
    // if login failed - wait a bit for the database docker
    await sleepms(1000);
  }

  if (!connected) {
    logger.error(`unable to connect to database`);
    return;
  }

  logger.info(`^gconnected to database`);
  logger.info(`running script`);

  let lineNumber = 1;
  for (var line of scriptLines) {
    try {
      if (line.trim() === "") continue;

      const command = (sudo ? `sudo mysql ` : `mysql -h database -u root -p${password} `) + `-e "${line}"`;

      // check is root password changed
      if (sudo && line.startsWith("ALTER USER 'root'@")) {
        logger.debug(`change to root password skipped in sudo mode`);
        continue;
      }

      execSync(command, { windowsHide: true, encoding: "buffer", stdio: "ignore" });

      // check is root password changed
      if (line.startsWith("ALTER USER 'root'@")) {
        logger.debug(`line ${lineNumber}: change to root password`);
        password = secureRootPassword;
      }
    } catch (error) {
      logger.error(`Error in line: ${lineNumber}`);
    }
    lineNumber++;
  }
  logger.info(`^gMYSQL script completed`);
}

// set all global loggers to the chain
const instanceName = `secureUpdateSql`;

setLoggerName(instanceName);
setGlobalLoggerLabel(instanceName);

// allow only one instance of the application

const SingleInstance = require("single-instance");
const locker = new SingleInstance(instanceName);

locker
  .lock()
  .then(function () {
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
