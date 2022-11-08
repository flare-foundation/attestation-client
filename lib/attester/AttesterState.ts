import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";
/**
 * Manages storing the attestation client results/state into the database
 * in regard to specific round.
 */
export class AttesterState {

  /**
   * Stores all attestation round state data.
   * @param round 
   * @param validTransactionCount 
   */
  async saveRound(round: AttestationRound, validTransactionCount = 0) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = round.roundId;
    dbRound.merkleRoot = round.roundMerkleRoot;
    dbRound.maskedMerkleRoot = round.roundMaskedMerkleRoot;
    dbRound.random = round.roundRandom;
    dbRound.hashedRandom = round.roundHashedRandom;
    dbRound.commitHash = round.roundCommitHash;
    dbRound.finalizedTimestamp = getUnixEpochTimestamp();
    dbRound.transactionCount = round.attestations.length;
    dbRound.validTransactionCount = validTransactionCount;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  /**
   * Stores partial attestation round data (comment)
   * @param round 
   * @param validTransactionCount 
   */
  async saveRoundComment(round: AttestationRound, validTransactionCount = 0) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = round.roundId;
    dbRound.transactionCount = round.attestations.length;
    dbRound.validTransactionCount = validTransactionCount;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  /**
   * Stores partial attestation round data (on commit)
   * @param roundId 
   * @param nounce 
   * @param txid 
   */
  async saveRoundCommited(roundId: number, nounce: number, txid: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;

    dbRound.commitTimestamp = getUnixEpochTimestamp();

    dbRound.commitNounce = nounce;
    dbRound.commitTransactionId = txid;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  /**
   *  Stores partial attestation round data (on reveal)
   * @param roundId 
   * @param nounce 
   * @param txid 
   */
  async saveRoundRevealed(roundId: number, nounce: number, txid: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;

    dbRound.revealTimestamp = getUnixEpochTimestamp();

    dbRound.revealNounce = nounce;
    dbRound.revealTransactionId = txid;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  /**
   * Reads round result data for a given @param roundId
   * @param roundId 
   * @returns 
   */
  async getRound(roundId: number): Promise<DBRoundResult> {
    const dbRound = await AttestationRoundManager.dbServiceAttester.manager.findOne(DBRoundResult, { where: { roundId: roundId } });

    if (dbRound) return dbRound;

    getGlobalLogger().warning(`state ^R#${roundId}^^ not found`);

    return undefined;
  }
}
