import { AlertStatus, PerformanceInfo } from "../../alerts/AlertBase";

export interface ServiceStatus {
  alerts: AlertStatus[];
  perf: PerformanceInfo[];
}

// export interface AlertsStatus {
//   type: string;
//   status: string;
//   state: string;
//   comment: string;
//   name: string;
//   timeLate: number;
// }

// export interface PerformanceStatus {
//   valueName: string;
//   valueUnit: string;
//   comment: string;
//   name: string;
//   value: number;
// }
