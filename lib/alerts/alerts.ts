import { TraceManager, traceManager } from "@flarenetwork/mcc";
import { DotEnvExt } from "../utils/DotEnvExt";
import { setLoggerName } from "../utils/logger";
import { AlertsManager } from "./AlertsManager";

DotEnvExt();

traceManager.displayStateOnException = false;
traceManager.displayRuntimeTrace = false;
TraceManager.enabled = false;

const alertsManager = new AlertsManager();

setLoggerName( "monitor" );

// eslint-disable-next-line
alertsManager.runAlerts();
