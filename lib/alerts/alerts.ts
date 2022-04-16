import { DotEnvExt } from "../utils/DotEnvExt";
import { AlertsManager } from "./AlertsManager";

DotEnvExt();

const alertsManager = new AlertsManager();

alertsManager.runAlerts();