import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { runWebserver } from "./servers/web-server/src/webserver";
import { setLoggerName } from "./utils/logging/logger";

traceManager.displayStateOnException = false;
traceManager.displayRuntimeTrace = false;
TraceManager.enabled = false;

setLoggerName("webserver");

// eslint-disable-next-line
runWebserver();
