import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { setLoggerName } from "./utils/logger";
import { MonitorManager } from "./monitor/MonitorManager";

traceManager.displayStateOnException = false;
traceManager.displayRuntimeTrace = false;
TraceManager.enabled = false;

const monitorManager = new MonitorManager();

setLoggerName( "monitor" );

// eslint-disable-next-line
monitorManager.runMonitor();
