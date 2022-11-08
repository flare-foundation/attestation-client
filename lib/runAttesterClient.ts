import { traceManager, TraceManager } from "@flarenetwork/mcc";
import { exit } from "process";
import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration, AttesterCredentials } from "./attester/AttesterClientConfiguration";
import { ChainsConfiguration } from "./chain/ChainConfiguration";
import { readConfig, readCredentials } from "./utils/config";
import { getGlobalLogger, logException, setLoggerName } from "./utils/logger";
import { setRetryFailureCallback } from "./utils/PromiseTimeout";

const yargs = require("yargs");

const args = yargs
  .option("instance", { alias: "i", type: "string", description: "Instance name", default: "default", demand: false }).argv;




// setup retry terminate callback
function terminateOnRetryFailure(label: string) {
    getGlobalLogger().error2(`retry failure: ${label} - application exit`);
    process.exit(2);
}

async function runAttester() {
    // setup debug trace
    TraceManager.enabled = false;
    traceManager.displayRuntimeTrace = false;
    traceManager.displayStateOnException = false;

    // setup retry terminate callback
    setRetryFailureCallback(terminateOnRetryFailure);

    // Reading configuration
    const chains = readConfig(new ChainsConfiguration(), "chains");
    const config = readConfig(new AttesterClientConfiguration(), "attester");
    const credentials = readCredentials(new AttesterCredentials(), "attester");


    // Create and start Attester Client
    const attesterClient = new AttesterClient(config, credentials, chains);
    return await attesterClient.runAttesterClient();
}

setLoggerName("attestation-client");


// allow only one instance of the application
var instanceName = `attestation-client-${args["instance"]}`;

var SingleInstance = require('single-instance');
var locker = new SingleInstance(instanceName);

locker.lock()
  .then(function () {
        // indexer entry point
        runAttester()
            .then(() => process.exit(0))
            .catch((error) => {
                logException(error, `runIndexer`);
                process.exit(1);
            });
        })
        .catch(function (err) {
          getGlobalLogger().error( `unable to start application. ^w${instanceName}^^ is locked` );
      
          // Quit the application
          exit(5);
        })
      