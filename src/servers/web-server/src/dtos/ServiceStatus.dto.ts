import { MonitorStatus, PerformanceMetrics } from "../../../../monitor/MonitorBase";

export class ServiceStatus {
  alerts: MonitorStatus[];
  perf: PerformanceMetrics[];
}
