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

   public async getProofForRound(roundId: number) {
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
      return result as any as VotingRoundResult[];
   }

   private canReveal(roundId: number) {
      let current = this.configService.epochSettings.getCurrentEpochId().toNumber();
      return current >= roundId + 2; // we must be in the reveal phase or later for a given roundId
   }

   public async systemStatus(): Promise<SystemStatus> {
      let currentBufferNumber = this.configService.epochSettings.getCurrentEpochId().toNumber();
      let maxQuery = this.dbService.connection.manager
         .createQueryBuilder(DBVotingRoundResult, "voting_round_result")
         .select("MAX(voting_round_result.roundId)", "max");
      let res = await maxQuery.getRawOne();
      let latestAvailableRoundId = res?.max;
      return {
         currentBufferNumber,
         latestAvailableRoundId
      }
   }
}
