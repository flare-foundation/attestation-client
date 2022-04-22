import { Factory, Inject, Singleton } from "typescript-ioc";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
import { ServiceStatus } from "../dto/ServiceStatus";
import { SystemStatus } from "../dto/SystemStatus";
import { VotingRoundResult } from "../dto/VotingRoundResult";
import { ConfigurationService } from "../services/configurationService";
import { WebDatabaseService } from "../services/webDBService";

import fs from "fs";
@Singleton
@Factory(() => new ProofEngine())
export class ProofEngine {

   @Inject
   private dbService: WebDatabaseService;

   @Inject
   private configService: ConfigurationService;

   // never expiring cache. Once round data are finalized, they do not change.
   // cache expires only on process restart.
   private cache = {};

   public async getProofForRound(roundId: number) {
      if (this.cache[roundId]) {
         return this.cache[roundId];
      }
      await this.dbService.waitForDBConnection();
      if (!this.canReveal(roundId)) {
         throw new Error("Voting round results cannot be revealed yet.");
      }
      let query = this.dbService.connection.manager
         .createQueryBuilder(DBVotingRoundResult, "voting_round_result")
         .andWhere("voting_round_result.roundId = :roundId", { roundId });
      let result = await query.getMany();
      result.forEach(item => {
         item.request = JSON.parse(item.request);
         item.response = JSON.parse(item.response);
      })
      let finalResult = result as any as VotingRoundResult[];
      // cache once finalized
      if (finalResult.length > 0) {
         this.cache[roundId] = finalResult;
      } else {
         let maxRound = await this.maxRoundId();
         if(maxRound > roundId) {
            this.cache[roundId] = [];
         }
      }
      return finalResult;
   }

   private canReveal(roundId: number) {
      let current = this.configService.epochSettings.getCurrentEpochId().toNumber();
      return current >= roundId + 2; // we must be in the reveal phase or later for a given roundId
   }

   private async maxRoundId() {
      let maxQuery = this.dbService.connection.manager
         .createQueryBuilder(DBVotingRoundResult, "voting_round_result")
         .select("MAX(voting_round_result.roundId)", "max");
      let res = await maxQuery.getRawOne();
      return res?.max;
   }

   public async systemStatus(): Promise<SystemStatus> {
      await this.dbService.waitForDBConnection();
      let currentBufferNumber = this.configService.epochSettings.getCurrentEpochId().toNumber();
      let latestAvailableRoundId = await this.maxRoundId();
      // Do not disclose the latest available round, if it is too early
      if (latestAvailableRoundId + 1 === currentBufferNumber) {
         latestAvailableRoundId = currentBufferNumber - 2;
      }
      return {
         currentBufferNumber,
         latestAvailableRoundId
      }
   }

   public async serviceStatus(): Promise<ServiceStatus[]> {
      let path = this.configService.serverConfig.serviceStatusFilePath;
      if(!path) {
         return []
      }
      let statuses = JSON.parse(fs.readFileSync(path).toString());
      return statuses as any as ServiceStatus[];
   }

   public async serviceStatusHtml(): Promise<string> {
      let path = this.configService.serverConfig.serviceStatusFilePath;
      let statuses = JSON.parse(fs.readFileSync(path).toString()) as ServiceStatus[];

      let stat = fs.statSync(path);
      let oneService = (status: ServiceStatus) => {
         return `
      <tr>
         <td>${status.name}</td>
         <td class="${status.status}">${status.status}</td>
         <td>${status.state}</td>
         <td>${status.comment}</td>
      </tr>    
`;
      }

      let rows = statuses.map(oneService).join("\n");

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

</style>
<head>
<body>
   <h1>Attestation service status</h1>
   <div class="time"><span class="time-label">Time:</span>${stat.mtime.toLocaleString()}</div>
   <table border="0" cellpadding="0" cellspacing="0">
      <tr class="first-row">
         <th style="width: 10rem">name</th>
         <th style="width: 5rem">status</th>
         <th style="width: 5rem">state</th>
         <th>comment</th>
      </tr>
${rows}      
   </table>
   <script>
      setTimeout(() => {
         location.reload();
      }, 5000)
   </script>
</body>
</html>
`
   }

}
