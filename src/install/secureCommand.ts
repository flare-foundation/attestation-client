import { execSync } from "child_process";
import { exit } from "process";
import { getSecureValue, initializeJSONsecure } from "../utils/config/jsonSecure";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logging/logger";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

const yargs = require("yargs");

// command line 
// -a action : command action 
const args = yargs
    .option("action", { alias: "a", type: "string", description: "command action", default: "", demand: true })
    .option("folder", { alias: "f", type: "string", description: "start folder", default: "", demand: false })
    .option("network", { alias: "n", type: "string", description: "network", default: "Coston", demand: false }).argv;

async function run() {
    const logger = getGlobalLogger();
    const action = args["action"];
    const folder = args["folder"];
    const network = args["network"];

    // read configuration
    await initializeJSONsecure(DEFAULT_SECURE_CONFIG_PATH, network);

    logger.info(`network: '${network}'`)

    let command = "";

    const passwordTestnet = getSecureValue(`BTCPassword`);
    const passwordMainnet = getSecureValue(`BTCPassword`);

    // todo: fix node installation so that password can be provided in more secure way (not via command line)
    switch (action) {
        case "installNodesTestNet":
            command = `sudo ./install.sh testnet ${passwordTestnet}`;
            break;
        case "installNodesMainNet":
            command = `sudo ./install.sh ${passwordMainnet}`;
            break;
    }

    if (command == "") {
        logger.error(`unknown action '${action}'`);
        return;
    }

    if (folder !== ``) {
        try {
            logger.info(`change folder to: '${folder}'`)
            process.chdir(folder);
        } catch (error) {
            getGlobalLogger(`error changing folder to '${folder}' (error ${error})`);
        }
    }

    try {
        logger.debug(command);
        execSync(command, { windowsHide: true, encoding: "buffer" });
    } catch (error) {
        logger.error(error);
    }

}

const instanceName = `secureCommand`;

// set all global loggers to the chain
setLoggerName(instanceName);
setGlobalLoggerLabel(instanceName);

// allow only one instance of the application

const SingleInstance = require('single-instance');
const locker = new SingleInstance(instanceName);

locker.lock()
    .then(function () {
        // entry point
        run()
            .then(() => process.exit(0))
            .catch((error) => {
                logException(error, `secureCommand`);
                process.exit(1);
            });
    })
    .catch(function (err) {
        getGlobalLogger().error(`unable to start application. ^w${instanceName}^^ is locked`);
        // Quit the application
        exit(2);
    })