import { AlertStatus, PerformanceInfo } from "../../../../alerts/AlertBase";

export interface ServiceStatus {
  alerts: AlertStatus[];
  perf: PerformanceInfo[];
}
