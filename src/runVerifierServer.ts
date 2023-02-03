import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { runVerifierServer } from "./servers/verifier-server/src/verifierServer";
import { getGlobalLogger, setLoggerName } from "./utils/logging/logger";

const yargs = require("yargs");

const args = yargs
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "", demand: false }).argv;

traceManager.displayStateOnException = false;
traceManager.displayRuntimeTrace = false;
TraceManager.enabled = false;

setLoggerName("verifierServer");

if (args["chain"]) {
  process.env.VERIFIER_TYPE = args["chain"];
  getGlobalLogger().debug(`chain ${process.env.VERIFIER_TYPE} (set with command line)`);
}
else {
  getGlobalLogger().debug(`chain ${process.env.VERIFIER_TYPE} (set with env)`);
}

// eslint-disable-next-line
runVerifierServer();