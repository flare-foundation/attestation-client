import { retry } from "@flarenetwork/mcc";
import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { getGlobalLogger, logException } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { AttestationRound } from "./AttestationRound";

import _ from "lodash";
import { EntityManager } from "typeorm";
import { DatabaseService } from "../utils/databaseService";

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
    key_naming_transform?: (k: string) => string;
    do_not_upsert?: string[];
    isSqlite3?: boolean;
  }
) {
  const keys: string[] = _.difference(_.keys(obj), opts?.do_not_upsert ?? []);

  if (process.env.NODE_ENV === "development" && opts?.isSqlite3) {
    // Some issues with orUpdate on better-sqlite3
    await entityManager.getRepository(DBRoundResult).save(obj);
  } else {
    await entityManager
      .createQueryBuilder()
      .insert()
      .into(DBRoundResult)
      .values(obj)
      .orUpdate([primary_key], keys)
      .execute();
  }
}

/**
 * Manages storing the attestation client results/state into the database
 * in regard to specific round.
 */
export class AttesterState {

  databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  get entityManager(): EntityManager {
    return this.databaseService.manager;
  }

  private async saveOrUpdateRound(dbRound: DBRoundResult) {
    await retry(`saveOrUpdateRound #${dbRound.roundId}`, async () => {
      try {
        await Upsert(this.entityManager, dbRound, "roundId", { isSqlite3: this.databaseService.isSqlite3 });
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
   * Stores bit voting vote if the client voted in choose phase
   * @param roundId
   * @param nonce
   * @param txid
   */
  async saveRoundBitVoted(roundId: number, nonce: number, txid: string, bitVote: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;
    dbRound.bitVoteTimestamp = getUnixEpochTimestamp();
    dbRound.bitVoteNonce = nonce;
    dbRound.bitVoteTransactionId = txid;
    dbRound.bitVote = bitVote;

    await this.saveOrUpdateRound(dbRound);
  }

  /**
 * Stores bit voting result
 * @param roundId
 * @param nonce
 * @param txid
 */
  async saveRoundBitVoteResult(roundId: number, bitVoteResult: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;
    dbRound.bitVoteResultTimestamp = getUnixEpochTimestamp();
    dbRound.bitVoteResult = bitVoteResult;

    await this.saveOrUpdateRound(dbRound);
  }


  /**
   * Stores partial attestation round data (on commit)
   * @param roundId
   * @param nonce
   * @param txid
   */
  async saveRoundCommited(roundId: number, nonce: number, txid: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;
    dbRound.commitTimestamp = getUnixEpochTimestamp();
    dbRound.commitNonce = nonce;
    dbRound.commitTransactionId = txid;

    await this.saveOrUpdateRound(dbRound);
  }

  /**
   *  Stores partial attestation round data (on reveal)
   * @param roundId
   * @param nonce
   * @param txid
   */
  async saveRoundRevealed(roundId: number, nonce: number, txid: string) {
    const dbRound = new DBRoundResult();

    dbRound.roundId = roundId;

    dbRound.revealTimestamp = getUnixEpochTimestamp();
    dbRound.revealNonce = nonce;
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
