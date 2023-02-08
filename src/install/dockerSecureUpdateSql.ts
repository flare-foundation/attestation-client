import { execSync } from "child_process";
import fs from "fs";
import { exit } from "process";
import * as yargs from "yargs";
import { getSecureValue, initializeJSONsecure, _prepareSecureData } from "../utils/config/jsonSecure";
import { sleepms } from "../utils/helpers/utils";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logging/logger";
import { muteMySQLPasswords } from "./utils";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

const args = yargs
    .option("defaultSecureConfigPath", { alias: "p", type: "string", description: "default secure config path", default: DEFAULT_SECURE_CONFIG_PATH, demand: false })
    .option("input", { alias: "i", type: "string", description: "input file", default: DEFAULT_SECURE_CONFIG_PATH, demand: true })
    .option("chain", { alias: "n", type: "string", description: "node name", default: "", demand: false })
    .option("network", { alias: "e", type: "string", description: "network", default: "Coston", demand: false }).argv;

async function run() {
    const logger = getGlobalLogger();

    const inputFile = args["input"];
    const nodeName = args["chain"].toUpperCase();

    // read configuration
    await initializeJSONsecure(args["defaultSecureConfigPath"], args["network"]);

    const inputFilename = `configs/.install/templates/sql/${inputFile}.sql`;

    const data = fs.readFileSync(inputFilename).toString();
    const scriptLines = _prepareSecureData(data, inputFilename, nodeName, `Chain`).split(/\r?\n/);

    // get secure DatabaseRootPassword
    const secureRootPassword = getSecureValue(`DatabaseRootPassword`);

    // wait for database
    let connected = false;
    let password = "";

    for (let retry = 0; retry < 60; retry++) {
        try {
            const secureLogin = (retry & 1) === 0;
            password = secureLogin ? secureRootPassword : process.env.MYSQL_ROOT_PASSWORD;
            const command = `mysql -h database -u root -p${password} -e ";"`;
            //logger.debug(muteMySQLPasswords(command));
            logger.debug(`connecting to database ${retry}`);

            execSync(command, { windowsHide: true, encoding: "buffer" });
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
            logger.error(`unable to connect to database`);
            //logger.exception(muteMySQLPasswords(error.message));
        }
        // if login failed - wait a bit for the database docker
        await sleepms(1000);
    }

    if (!connected) {
        logger.error(`unable to connect to database`);
        return;
    }

    let lineNumber = 1;
    for (var line of scriptLines) {
        try {
            const command = `mysql -h database -u root -p${password} -e "${line}"`;
            //logger.debug(muteMySQLPasswords(command));
            execSync(command, { windowsHide: true, encoding: "buffer" });
        } catch (error) {
            logger.error(`Error in line: ${lineNumber} while running SQL install script ^w${muteMySQLPasswords(error.message)}`);
        }
        lineNumber++;
    }
}

// set all global loggers to the chain
const instanceName = `secureUpdateSql`;

setLoggerName(instanceName);
setGlobalLoggerLabel(instanceName);

// allow only one instance of the application

const SingleInstance = require('single-instance');
const locker = new SingleInstance(instanceName);

locker.lock()
    .then(function () {
        run()
            .then(() => process.exit(0))
            .catch((error) => {
                logException(error, `secureUpdateSql`);
                process.exit(1);
            });
    }).catch(function (err) {
        getGlobalLogger().error(`unable to start application. ^w${instanceName}^^ is locked`);
        // Quit the application
        exit(2);
    })
