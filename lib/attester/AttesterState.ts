import { retry } from "@flarenetwork/mcc";
import { DBRoundResult } from "../entity/attester/dbRoundResult";
import { getGlobalLogger, logException } from "../utils/logger";
import { getUnixEpochTimestamp } from "../utils/utils";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";

import _ from 'lodash'

async function Upsert<T>(
  obj: T,
  primary_key: string,
  opts?: {
      key_naming_transform: (k: string) => string,
      do_not_upsert: string[],
  }
)
{
  const keys: string[] = _.difference(_.keys(obj), opts ? opts.do_not_upsert : [])
  const setter_string = keys.map(k => `${opts ? opts.key_naming_transform(k) : k} = :${k}`)

  await AttestationRoundManager.dbServiceAttester.manager.createQueryBuilder()
      .insert()
      .into(DBRoundResult)
      .values(obj)
      .orUpdate( {
        conflict_target: [primary_key],  
        overwrite: keys
      } )    
      .execute();
}

/**
 * Manages storing the attestation client results/state into the database
 * in regard to specific round.
 */
export class AttesterState {

  private async saveOrUpdateRound(dbRound: DBRoundResult){

    await retry(`saveOrUpdateRound #${dbRound.roundId}`, async () => {

          try {
            await Upsert( dbRound , "roundId" );
            //await transaction.save( DBRoundResult, dbRound );
          }
          catch( error ) {
            logException( error , `saveOrUpdateRound.save(${dbRound.roundId})` );
          }



      // await AttestationRoundManager.dbServiceAttester.connection.transaction(async (transaction) => {
      //     try {
      //       await transaction.save( DBRoundResult, dbRound );
      //     }
      //     catch( error ) {
      //       logException( error , `saveOrUpdateRound.save(${dbRound.roundId})` );
      //     }


      //   const round = await transaction.findOne(DBRoundResult, { where: { roundId: dbRound.roundId } });

      //   if( round ) {
      //     try {
      //       await transaction.update( DBRoundResult, round, dbRound );
      //     }
      //     catch( error ) {
      //       logException( error , `saveOrUpdateRound.update(${dbRound.roundId})` );
      //     }
      //   }
      //   else {
      //     try {
      //       await transaction.insert( DBRoundResult, dbRound );
      //     }
      //     catch( error ) {
      //       logException( error , `saveOrUpdateRound.insert(${dbRound.roundId})` );
      //     }
      // }
    //}) 
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

    //await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
    await this.saveOrUpdateRound( dbRound );
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

    //await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
    await this.saveOrUpdateRound( dbRound );
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

    //await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
    await this.saveOrUpdateRound( dbRound );
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

    //await AttestationRoundManager.dbServiceAttester.manager.save(dbRound);
    await this.saveOrUpdateRound( dbRound );
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

