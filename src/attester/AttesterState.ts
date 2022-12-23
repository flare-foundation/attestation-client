import { retry } from "@flarenetwork/mcc";
import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { getGlobalLogger, logException } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { AttestationRound } from "./AttestationRound";

import _ from "lodash";
import { EntityManager } from "typeorm";

/**
 * Update or insert new state.
 * @param entityManager 
 * @param obj 
 * @param primary_key 
 * @param opts 
 */
async function Upsert<T>(
  entityManager: EntityManager,
  obj: T,
  primary_key: string,
  opts?: {
    key_naming_transform: (k: string) => string;
    do_not_upsert: string[];
  }
) {
  const keys: string[] = _.difference(_.keys(obj), opts ? opts.do_not_upsert : []);

  await entityManager
    .createQueryBuilder()
    .insert()
    .into(DBRoundResult)
    .values(obj)
    .orUpdate([primary_key], keys)
    .execute();
}

/**
 * Manages storing the attestation client results/state into the database
 * in regard to specific round.
 */
export class AttesterState {

  entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  private async saveOrUpdateRound(dbRound: DBRoundResult) {
    await retry(`saveOrUpdateRound #${dbRound.roundId}`, async () => {
      try {
        await Upsert(this.entityManager, dbRound, "roundId");
        //await transaction.save( DBRoundResult, dbRound );
      } catch (error) {
        logException(error, `saveOrUpdateRound.save(${dbRound.roundId})`);
      }
    });
  }

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
    dbRound.finalizedTimestamp = getUnixEpochTimestamp();
    dbRound.transactionCount = round.attestations.length;
    dbRound.validTransactionCount = validTransactionCount;

    await this.saveOrUpdateRound(dbRound);
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

    await this.saveOrUpdateRound(dbRound);
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

    await this.saveOrUpdateRound(dbRound);
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

    await this.saveOrUpdateRound(dbRound);
  }

  /**
   * Reads round result data for a given @param roundId
   * @param roundId
   * @returns
   */
  async getRound(roundId: number): Promise<DBRoundResult> {
    const dbRound = await this.entityManager.findOne(DBRoundResult, { where: { roundId: roundId } });

    if (dbRound) return dbRound;

    getGlobalLogger().warning(`state ^R#${roundId}^^ not found`);

    return undefined;
  }
}
