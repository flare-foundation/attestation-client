import { MonitorStatus, PerformanceInfo } from "../../../../monitor/MonitorBase";

export interface ServiceStatus {
  monitor: MonitorStatus[];
  perf: PerformanceInfo[];
}
