import { unPrefix0x } from "@flarenetwork/mcc";
import { Inject, Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import fs from "fs";
import { EntityManager } from "typeorm";
import { DBAttestationRequest } from "../../../../entity/attester/dbAttestationRequest";
import { DBVotingRoundResult } from "../../../../entity/attester/dbVotingRoundResult";
import { MonitorStatus, PerformanceInfo } from "../../../../monitor/MonitorBase";
import { MerkleTree } from "../../../../utils/data-structures/MerkleTree";
import { encodeRequest } from "../../../../verification/generated/attestation-request-encode";
import { ServiceStatus } from "../dtos/ServiceStatus.dto";
import { SystemStatus } from "../dtos/SystemStatus.dto";
import { VotingRoundRequest } from "../dtos/VotingRoundRequest.dto";
import { VotingRoundResult } from "../dtos/VotingRoundResult.dto";
import { ServerConfigurationService } from "./server-configuration.service";

@Injectable()
export class ProofEngineService {
  constructor(
    @Inject("SERVER_CONFIG") private configService: ServerConfigurationService,
    @InjectEntityManager("attesterDatabase") private manager: EntityManager
  ) { }

  // never expiring cache. Once round data are finalized, they do not change.
  // cache expires only on process restart.
  private cache = {};
  private requestCache = {};

  public async getVoteResultsForRound(roundId: number): Promise<VotingRoundResult[] | null> {
    if (this.cache[roundId]) {
      return this.cache[roundId];
    }

    if (!this.canReveal(roundId)) {
      return null;
    }

    const query = this.manager.createQueryBuilder(DBVotingRoundResult, "voting_round_result").andWhere("voting_round_result.roundId = :roundId", { roundId });
    const results = await query.getMany();

    const tree = new MerkleTree(results.map(result => result.hash));
    const hashMap = new Map<string, string[]>();
    for (let j = 0; j < tree.hashCount; j++) {
      const proof = tree.getProof(j);
      const hash = tree.getHash(j);
      hashMap.set(hash, proof);
    }

    const finalResult: VotingRoundResult[] = [];
    for (const res of results) {
      const request = JSON.parse(res.request);
      const requestBytes = encodeRequest(request).toLowerCase();
      const response = JSON.parse(res.response);
      const hash = res.hash;
      const roundId = res.roundId;
      const merkleProof = hashMap.get(hash);
      finalResult.push(
        { roundId, hash, requestBytes, request, response, merkleProof } as VotingRoundResult
      )
    }

    // cache once finalized
    if (finalResult.length > 0) {
      this.cache[roundId] = finalResult;
    } else {
      const maxRound = await this.maxRoundId();
      if (maxRound > roundId) {
        this.cache[roundId] = [];
      }
    }

    return finalResult;
  }

  public async getSpecificProofForRound(roundId: number, callData: string): Promise<VotingRoundResult | null> {
    const roundData = await this.getVoteResultsForRound(roundId);
    const upCallData = unPrefix0x(callData).toLowerCase();
    for (const proof of roundData) {
      if (unPrefix0x(proof.requestBytes) === upCallData) {
        return proof;
      }
    }
    return null;
  }

  public async getRequestsForRound(roundId: number): Promise<VotingRoundRequest[] | null> {
    if (this.requestCache[roundId]) {
      return this.requestCache[roundId];
    }

    if (!this.canReveal(roundId)) {
      return null;
    }

    const query = this.manager
      .createQueryBuilder(DBAttestationRequest, "attestation_request")
      .andWhere("attestation_request.roundId = :roundId", { roundId })
      .select("attestation_request.requestBytes", "requestBytes")
      .addSelect("attestation_request.verificationStatus", "verificationStatus")
      .addSelect("attestation_request.attestationStatus", "attestationStatus")
      .addSelect("attestation_request.exceptionError", "exceptionError");

    const result = await query.getRawMany();

    result.forEach((item) => {
      item.roundId = roundId;
      if (item.exceptionError === "") {
        item.exceptionError = undefined;
      }
      if (!item.attestationStatus) {
        item.attestationStatus = undefined;
      }
    });

    let finalResult = result as any as VotingRoundRequest[];
    // cache once finalized
    if (finalResult.length > 0) {
      this.requestCache[roundId] = finalResult;
    } else {
      let maxRound = await this.maxRoundId();
      if (maxRound > roundId) {
        this.requestCache[roundId] = [];
      }
    }
    return finalResult;
  }

  private canReveal(roundId: number) {
    let current = this.configService.epochSettings.getCurrentEpochId().toNumber();
    return current >= roundId + 2; // we must be in the reveal phase or later for a given roundId
  }

  private async maxRoundId() {
    let maxQuery = this.manager.createQueryBuilder(DBVotingRoundResult, "voting_round_result").select("MAX(voting_round_result.roundId)", "max");
    let res = await maxQuery.getRawOne();
    return res?.max;
  }

  public async systemStatus(): Promise<SystemStatus> {
    let currentBufferNumber = this.configService.epochSettings.getCurrentEpochId().toNumber();
    let latestAvailableRoundId = await this.maxRoundId();
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
    let path = this.configService.serverCredentials.serviceStatusFilePath;
    if (!path) {
      return {
        alerts: [],
        perf: [],
      };
    }
    let statuses = JSON.parse(fs.readFileSync(path).toString());
    let perf = (statuses as any).perf;
    return {
      alerts: (statuses as any).alerts as MonitorStatus[],
      perf,
    };
  }

  public async serviceStatusHtml(): Promise<string> {
    let { currentBufferNumber, latestAvailableRoundId } = await this.systemStatus();
    let path = this.configService.serverCredentials.serviceStatusFilePath;
    let statuses = await this.serviceStatus();

    let stat = fs.statSync(path);
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

    let rows = statuses.alerts.map(oneService).join("\n");
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
   background-color: #eee;
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
<body>
   <h1>Attestation service status</h1>
   <div class="time"><span class="time-label">Time:</span>${stat.mtime.toLocaleString()}</div>

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
