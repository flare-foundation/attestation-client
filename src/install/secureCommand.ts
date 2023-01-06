import { execSync } from "child_process";
import { exit } from "process";
import { getSecureValue, initializeJSONsecure } from "../utils/jsonSecure";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logger";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

const yargs = require("yargs");

// command line 
// -a action : command action 
const args = yargs
    .option("action", { alias: "a", type: "string", description: "command action", default: "", demand: true })
    .option("folder", { alias: "f", type: "string", description: "start folder", default: "", demand: false })
    .option("network", { alias: "n", type: "string", description: "network", default: "Coston", demand: false }).argv;

async function run() {
    const action = args["action"];
    const folder = args["folder"];
    const network = args["network"];

    // read configuration
    await initializeJSONsecure(DEFAULT_SECURE_CONFIG_PATH, network);

    getGlobalLogger().info(`network: '${network}'`)

    let command = "";

    const passwordTestnet = getSecureValue(`BTCPassword`);
    const passwordMainnet = getSecureValue(`BTCPassword`);

    // todo: fix node installation so that password can be provided in more secure way (not via command line)
    switch (action) {
        case "installNodesTestNet": command = `sudo ./install.sh testnet ${passwordTestnet}`; break;
        case "installNodesMainNet": command = `sudo ./install.sh ${passwordMainnet}`; break;
    }

    if (command == "") {
        getGlobalLogger().error(`unknown action '${action}'`);
        return;
    }

    if (folder !== ``) {
        try {
            getGlobalLogger().info(`change folder to: '${folder}'`)
            process.chdir(folder);
        }
        catch (error) {
            getGlobalLogger(`error changinf folder to '${folder}' (error ${error})`);
        }
    }

    try {

        getGlobalLogger().debug(command);

        execSync(command, { windowsHide: true, encoding: "buffer" });
    }
    catch (error) { }

}

// set all global loggers to the chain
setLoggerName("secureCommand");
setGlobalLoggerLabel("secureCommand");

// allow only one instance of the application
var instanceName = `secureCommand`;

var SingleInstance = require('single-instance');
var locker = new SingleInstance(instanceName);

locker.lock()
    .then(function () {

        // indexer entry point
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