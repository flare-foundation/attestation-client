import {
  DBDogeIndexerBlock,
  DBDogeTransaction,
  DBTransactionInput,
  DBTransactionInputCoinbase,
  DBTransactionOutput,
  PruneSyncState,
  TipSyncState,
} from "../../entity-external/DogeExternalEntities";
import { DBAttestationRequest } from "../../entity/attester/dbAttestationRequest";
import { DBRoundResult } from "../../entity/attester/dbRoundResult";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
import { DBBlockBTC, DBBlockBase, DBBlockDOGE, DBBlockXRP } from "../../entity/indexer/dbBlock";
import { DBState } from "../../entity/indexer/dbState";

import {
  DBTransactionBTC0,
  DBTransactionBTC1,
  DBTransactionBase,
  DBTransactionDOGE0,
  DBTransactionDOGE1,
  DBTransactionXRP0,
  DBTransactionXRP1,
} from "../../entity/indexer/dbTransaction";

/**
 * Given a chain name it returns the list of entities (classes) that are relevant for this chain in the
 * indexer database.
 * @param chain
 * @returns
 */
export function indexerEntities(chain: string) {
  const entities: any = [DBTransactionBase, DBBlockBase, DBState];
  switch (chain.toLowerCase()) {
    case "btc":
      entities.push(DBBlockBTC, DBTransactionBTC0, DBTransactionBTC1);
      break;
    case "doge":
      entities.push(DBBlockDOGE, DBTransactionDOGE0, DBTransactionDOGE1);
      break;
    case "doge-external":
      return [DBDogeIndexerBlock, DBDogeTransaction, DBTransactionInput, DBTransactionInputCoinbase, DBTransactionOutput, TipSyncState, PruneSyncState];
    case "xrp":
      entities.push(DBBlockXRP, DBTransactionXRP0, DBTransactionXRP1);
      break;
    default:
      throw new Error(`Wrong verifier type '${chain}'`);
  }
  return entities;
}

/**
 * Returns the list of entities (classes) for the attestation client database.
 * @returns
 */
export function attesterEntities() {
  return [DBAttestationRequest, DBRoundResult, DBVotingRoundResult];
}
