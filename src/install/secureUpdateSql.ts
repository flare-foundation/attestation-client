import { execSync } from "child_process";
import { exit } from "process";
import { initializeJSONsecure, readFileSecure } from "../utils/jsonSecure";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "../utils/logger";
import { sleepms } from "../utils/utils";

const DEFAULT_SECURE_CONFIG_PATH = "../attestation-suite-config";

async function run() {
    // read configuration
    await initializeJSONsecure(DEFAULT_SECURE_CONFIG_PATH, "Coston");

    const installLines = readFileSecure("configs/.install/templates/sql/install.sql").split(/\r?\n/);
    const updateLines = readFileSecure("configs/.install/templates/sql/update.sql").split(/\r?\n/);

    const { exec } = require("child_process");

    // wait for database
    let connected = false;
    for(let retry=0; retry<60; retry++)
    {
        try {
            const command = `mysql -h database -u root -p${process.env.MYSQL_ROOT_PASSWORD} -e ";"`;

            getGlobalLogger().debug(command);

            execSync(command, { windowsHide: true, encoding: "buffer" });

            connected = true;

            break;
        }
        catch (error) { 
            getGlobalLogger().exception(error);
        }

        await sleepms( 1000 );
    }

    if( !connected )
    {
        getGlobalLogger().error( `unable to connect to database`);
        return;
    }


    for (var line of installLines) {
        try {
            const command = `mysql -h database -u root -p${process.env.MYSQL_ROOT_PASSWORD} -e "${line}"`;

            getGlobalLogger().debug(command);

            execSync(command, { windowsHide: true, encoding: "buffer" });
        }
        catch (error) { 

        }
    }

    for (var line of updateLines) {
        try {
            const command = `mysql -h database -u root -p${process.env.MYSQL_ROOT_PASSWORD} -e "${line}"`;

            getGlobalLogger().debug(command);
            execSync(command, { windowsHide: true, encoding: "buffer" });
        }
        catch (error) { }
    }
}

// set all global loggers to the chain
setLoggerName("secureUpdateSql");
setGlobalLoggerLabel("secureUpdateSql");

// allow only one instance of the application
var instanceName = `secureUpdateSql`;

var SingleInstance = require('single-instance');
var locker = new SingleInstance(instanceName);

locker.lock()
    .then(function () {

        // indexer entry point
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
    })