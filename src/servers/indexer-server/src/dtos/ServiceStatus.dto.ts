import { MonitorStatus, PerformanceInfo } from "../../../../monitor/MonitorBase";

export interface ServiceStatus {
  alerts: MonitorStatus[];
  perf: PerformanceInfo[];
}
