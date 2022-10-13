import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";

/**
 * Class for storing and fatchig data to and from database???
 */
export class AttesterState {
  async saveRound(round: AttestationRound, validTransactionCount: number = 0) {
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

  async saveRoundComment(round: AttestationRound, validTransactionCount: number = 0) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = round.roundId;
    dbRound.transactionCount = round.attestations.length;
    dbRound.validTransactionCount = validTransactionCount;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  async saveRoundCommited(roundId: number, nounce: number, txid: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;

    dbRound.commitTimestamp = getUnixEpochTimestamp();

    dbRound.commitNounce = nounce;
    dbRound.commitTransactionId = txid;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  async saveRoundRevealed(roundId: number, nounce: number, txid: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;

    dbRound.revealTimestamp = getUnixEpochTimestamp();

    dbRound.revealNounce = nounce;
    dbRound.revealTransactionId = txid;

    await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
  }

  async getRound(roundId: number): Promise<DBRoundResult> {
    var dbRound = await AttestationRoundManager.dbServiceAttester.manager.findOne(DBRoundResult, { where: { roundId: roundId } });

    if (dbRound) return dbRound;

    getGlobalLogger().warning(`state ^R#${roundId}^^ not found`);

    return undefined;
  }
}
