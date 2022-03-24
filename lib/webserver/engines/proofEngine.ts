import { Factory, Inject, Singleton } from "typescript-ioc";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
import { VotingRoundResult } from "../dto/VotingRoundResult";
import { WebDatabaseService } from "../services/webDBService";

@Singleton
@Factory(() => new ProofEngine())
export class ProofEngine {

   @Inject
   private dbService: WebDatabaseService;

   public async getProofForRound(roundId: number) {
      await this.dbService.waitForDBConnection();
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

}
