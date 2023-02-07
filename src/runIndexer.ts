import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { exit } from "process";
import { Indexer } from "./indexer/indexer";
import { IndexerConfig } from "./indexer/IndexerConfig";
import { ListChainConfig } from "./attester/configs/ChainConfig";
import { readSecureConfig } from "./utils/config/configSecure";
import { getGlobalLogger, logException, setGlobalLoggerLabel, setLoggerName } from "./utils/logging/logger";
import { setRetryFailureCallback } from "./utils/helpers/promiseTimeout";
import * as yargs from "yargs";

const args = yargs
  .option("reset", { alias: "r", type: "string", description: "Reset commands", default: true, demand: false })
  .option("setn", { alias: "n", type: "number", description: "Force set chain N", default: 0, demand: false })
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "btc", demand: false }).argv;

function terminateOnRetryFailure(label: string) {
  getGlobalLogger().error2(`retry failure: ${label} - application exit`);
  process.exit(2);
}

async function runIndexer() {
  // setup debug trace
  TraceManager.enabled = false;
  traceManager.displayRuntimeTrace = false;
  traceManager.displayStateOnException = false;

  //TraceManager.enabled = true;
  //traceManager.displayRuntimeTrace = true;
  //traceManager.displayStateOnException = true;

  // setup retry terminate callback
  setRetryFailureCallback(terminateOnRetryFailure);

  // read configuration
  const config = await readSecureConfig(new IndexerConfig(), `indexer/${args["chain"].toLowerCase()}-indexer`);

  // create and start indexer
  const indexer = new Indexer(config, args["chain"].toUpperCase());
  return await indexer.runIndexer(args);
}

// set all global loggers to the chain
setLoggerName("indexer");
setGlobalLoggerLabel(args["chain"]);

// allow only one instance of the application
var instanceName = `indexer-${args["chain"]}`;

var SingleInstance = require('single-instance');
var locker = new SingleInstance(instanceName);

locker.lock()
  .then(function () {

    // indexer entry point
    runIndexer()
      .then(() => process.exit(0))
      .catch((error) => {
        logException(error, `runIndexer`);
        process.exit(1);
      });
  })
  .catch(function (err) {
    getGlobalLogger().error(`unable to start application. ^w${instanceName}^^ is locked`);

    // Quit the application
    exit(5);
  })


