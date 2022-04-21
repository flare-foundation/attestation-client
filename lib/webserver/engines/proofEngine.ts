import { Factory, Inject, Singleton } from "typescript-ioc";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
import { SystemStatus } from "../dto/SystemStatus";
import { VotingRoundResult } from "../dto/VotingRoundResult";
import { ConfigurationService } from "../services/configurationService";
import { WebDatabaseService } from "../services/webDBService";

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
}
