import { traceManager, TraceManager } from "@flarenetwork/mcc";
import { AttesterClient } from "./attester/AttesterClient";
import { AttesterClientConfiguration, AttesterCredentials } from "./attester/AttesterClientConfiguration";
import { ChainsConfiguration } from "./chain/ChainConfiguration";
import { readConfig, readCredentials } from "./utils/config";
import { getGlobalLogger, logException, setLoggerName } from "./utils/logger";
import { setRetryFailureCallback } from "./utils/PromiseTimeout";

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

// indexer entry point
runAttester()
    .then(() => process.exit(0))
    .catch((error) => {
        logException(error, `runIndexer`);
        process.exit(1);
    });