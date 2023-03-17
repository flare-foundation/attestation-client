import { MonitorStatus, PerformanceMetrics } from "../../../../monitor/MonitorBase";

export interface ServiceStatus {
  alerts: MonitorStatus[];
  perf: PerformanceMetrics[];
}
