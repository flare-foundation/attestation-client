import { ChainsConfiguration } from "./chain/ChainConfiguration";
import { Indexer } from "./indexer/indexer";
import { IndexerConfiguration, IndexerCredentials } from "./indexer/IndexerConfiguration";
import { readConfig, readCredentials } from "./utils/config";
import { DotEnvExt } from "./utils/DotEnvExt";
import { getGlobalLogger, logException, setGlobalLoggerLabel } from "./utils/logger";
import { setRetryFailureCallback } from "./utils/PromiseTimeout";

var yargs = require("yargs");

const args = yargs
    .option("reset", { alias: "r", type: "string", description: "Reset commands", default: "", demand: false })
    .option("setn", { alias: "n", type: "number", description: "Force set chain N", default: 0, demand: false })
    .option("chain", { alias: "a", type: "string", description: "Chain", default: "XRP", demand: false }).argv;

function localRetryFailure(label: string) {
    getGlobalLogger().error2(`retry failure: ${label} - application exit`);
    process.exit(2);
}

async function runIndexer() {

    //traceManager.displayRuntimeTrace=true;

    setRetryFailureCallback(localRetryFailure);

    // Reading configuration
    const config = readConfig(new IndexerConfiguration(), "indexer");
    const chains = readConfig(new ChainsConfiguration(), "chains");
    const credentials = readCredentials(new IndexerCredentials(), "indexer");

    const indexer = new Indexer(config, chains, credentials, args["chain"]);

    return await indexer.runIndexer(args);
}

// set all global loggers to the chain
setGlobalLoggerLabel(args["chain"]);

// read .env
DotEnvExt();

runIndexer()
    .then(() => process.exit(0))
    .catch((error) => {
        logException(error, `runIndexer `);
        process.exit(1);
    });
