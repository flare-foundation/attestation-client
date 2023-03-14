import { MonitorStatus, PerformanceMetrics } from "../../../../monitor/MonitorBase";

export interface ServiceStatus {
  monitor: MonitorStatus[];
  perf: PerformanceMetrics[];
}
