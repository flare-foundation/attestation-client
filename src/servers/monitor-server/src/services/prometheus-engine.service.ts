import { Inject, Injectable } from "@nestjs/common";
import { MonitorStatus, PerformanceInfo } from "../../../../monitor/MonitorBase";
import { getPrometheusMetrics, getStatusJson, getStatusObject } from "../../../../monitor/MonitorManager";
import { ServiceStatus } from "../dtos/ServiceStatus.dto";
import { SystemStatus } from "../dtos/SystemStatus.dto";
import { ServerConfigurationService } from "./server-configuration.service";

@Injectable()
export class PrometheusEngineService {
  constructor(
    @Inject("SERVER_CONFIG") private configService: ServerConfigurationService
  ) { }

  public async servicePrometheusMetrics(): Promise<string> {
    return await getPrometheusMetrics();
  }

  public async serviceStatusJson(): Promise<string> {
    return await getStatusJson();
  }




  public async systemStatus(): Promise<SystemStatus> {
    let currentBufferNumber = 0; //this.configService.epochSettings.getCurrentEpochId().toNumber();
    let latestAvailableRoundId = 0; //await this.maxRoundId();
    // Do not disclose the latest available round, if it is too early
    if (latestAvailableRoundId + 1 === currentBufferNumber) {
      latestAvailableRoundId = currentBufferNumber - 2;
    }
    return {
      currentBufferNumber,
      latestAvailableRoundId,
    };
  }

  public async serviceStatus(): Promise<ServiceStatus> {
    let statuses = await getStatusObject();

    let perf = (statuses as any).perf;
    return {
      monitor: (statuses as any).monitor as MonitorStatus[],
      perf,
    };
  }

  public async serviceStatusHtml(): Promise<string> {

    let { currentBufferNumber, latestAvailableRoundId } = await this.systemStatus();
    let statuses = await this.serviceStatus();

    let oneService = (status: MonitorStatus) => {
      return `
      <tr>
         <td>${status.type}</td>
         <td>${status.name}</td>
         <td class="${status.status}">${status.status}</td>
         <td>${status.state}</td>
         <td>${status.comment}</td>
      </tr>    
`;
    };

    let onePerformance = (status: PerformanceInfo) => {
      return `
      <tr>
         <td>${status.name}</td>
         <td style="padding-right: 1rem">${status.valueName}</td>
         <td class="align-right">${status.value}</td>         
         <td style="padding-right: 1rem">${status.valueUnit}</td>         
         <td>${status.comment}</td>
      </tr>    
`;
    };

    let rows = statuses.monitor.map(oneService).join("\n");
    let performanceRows = statuses.perf.map(onePerformance).join("\n");

    return `
<html>
<head>
<style>
th {
   text-align: left; 
   padding: 2px;
   padding-left: 0.25rem;
   padding-right: 0.25rem;
}

td {
   text-align: left; 
   padding: 2px;
   padding-left: 0.25rem;
   padding-right: 0.25rem;
}

h1 {
   margin-left: 0.25rem;
}

body {
   font-family: "Arial";
}

.first-row {
   background-color: #707070;
}

.running {
   background-color: #00ff00;
}

.down {
   background-color: #ff0000;
}

.late {
   background-color: #FFCC00;
}

.time {
   margin-top: 0.25rem;
   margin-bottom: 1rem;
   margin-left: 0.25rem;
}

.time-label {
   font-weight: 600;
   margin-right: 0.25rem;
}

.status-block {
   margin-top: 1rem;
}

.mid-title {
   margin-left: 0.25rem;
   margin-top: 1rem;
   margin-bottom: 1rem;
   font-size: 1.2rem;   
   font-weight: 600;
}

.align-right {
   text-align: right;
}

</style>

<!-- <meta http-equiv="refresh" content="5"> -->

<script type="text/javascript">
   function autoRefresh() {
      window.location = window.location.href;
   }
   setInterval('autoRefresh()', 5000);
</script>

</head>
<body style="background-color:#404040">
   <h1>Attestation Suite Status</h1>
   <div class="time"><span class="time-label">Time:</span>${new Date()}</div>

   <div class="mid-title">Services</div>

   <table border="0" cellpadding="0" cellspacing="0">
      <tr class="first-row">
         <th style="width: 10rem">type</th>
         <th style="width: 10rem">name</th>
         <th style="width: 5rem">status</th>
         <th style="width: 5rem">action</th>
         <th>comment</th>
      </tr>
${rows}      
   </table>
   
   <div class="mid-title">Rounds</div>

   <table border="0" cellpadding="0" cellspacing="0" class="status-block">
      <tr>
        <td>Current buffer number:</td>
        <td> ${currentBufferNumber}</td>
      </tr> 
      <tr>
        <td>Votes for latest commited round id:</td>
        <td> <a href="../proof/votes-for-round/${latestAvailableRoundId}" target="_blank">${latestAvailableRoundId}</a></td>
      </tr> 
      <tr>
        <td>Requests for latest commited round id:</td>
        <td> <a href="../proof/requests-for-round/${latestAvailableRoundId}" target="_blank">${latestAvailableRoundId}</a></td>
      </tr> 
   </table>

   <div class="mid-title">Performance</div>
   <table border="0" cellpadding="0" cellspacing="0">
      <tr class="first-row">
         <th style="width: 10rem">group</th>
         <th>name</th>
         <th>value</th>
         <th></th>
         <th>comment</th>
      </tr>
${performanceRows}      
   </table>
</body>
</html>
`;
  }
}
