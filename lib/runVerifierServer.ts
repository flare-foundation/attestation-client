import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { runVerifierServer } from "./servers/verifier-server/src/verifierServer";
import { setLoggerName } from "./utils/logger";

traceManager.displayStateOnException = false;
traceManager.displayRuntimeTrace = false;
TraceManager.enabled = false;

setLoggerName("verifierServer");

// eslint-disable-next-line
runVerifierServer();