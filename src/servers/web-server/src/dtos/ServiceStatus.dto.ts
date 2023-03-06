import { MonitorStatus, PerformanceInfo } from "../../../../monitor/MonitorBase";

export class ServiceStatus {
  alerts: MonitorStatus[];
  perf: PerformanceInfo[];
}
