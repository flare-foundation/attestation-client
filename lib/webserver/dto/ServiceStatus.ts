export interface ServiceStatus {
   alerts: AlertsStatus[];
   perf: PerformanceStatus[];
}

export interface AlertsStatus {
   status: string;
   state: string;
   comment: string;
   name: string;
   timeLate: number
}

export interface PerformanceStatus {
   valueName: string;
   valueUnit: string;
   comment: string;
   name: string;
   value: number;
}