import { prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { ARBalanceDecreasingTransaction } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { IndexedQueryManager } from "../IndexedQueryManager";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type BalanceDecreasingTransaction
/////////////////////////////////////////////////////////////////

export type RandomBalanceDecreasingTransactionChoiceType = "CORRECT" | "WRONG_DATA_AVAILABILITY_PROOF" | "NON_EXISTENT_TX_ID";

const RANDOM_OPTIONS_BALANCE_DECREASING_TRANSACTION = [
  { name: "CORRECT", weight: 10 },
  { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
  { name: "NON_EXISTENT_TX_ID", weight: 1 },
] as WeightedRandomChoice<RandomBalanceDecreasingTransactionChoiceType>[];

export async function prepareRandomizedRequestBalanceDecreasingTransaction(
  indexedQueryManager: IndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: SourceId,
  roundId: number,
  enforcedChoice?: RandomBalanceDecreasingTransactionChoiceType
): Promise<ARBalanceDecreasingTransaction | null> {
  if (!randomTransaction) {
    return null;
  }
  const confirmationBlockQueryResult = await indexedQueryManager.queryBlock({
    blockNumber: randomTransaction.blockNumber + this.indexedQueryManager.settings.numberOfConfirmations(),
  });
  if (!confirmationBlockQueryResult?.result) {
    const N = await indexedQueryManager.getLastConfirmedBlockNumber();
    console.log("No confirmation block", randomTransaction.blockNumber, N, indexedQueryManager.settings.numberOfConfirmations(), roundId);
    return null;
  }

  const choice = enforcedChoice
    ? RANDOM_OPTIONS_BALANCE_DECREASING_TRANSACTION.find((x) => x.name === enforcedChoice)
    : randomWeightedChoice(RANDOM_OPTIONS_BALANCE_DECREASING_TRANSACTION);

  if (!choice) {
    return null;
  }

  const id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.transactionId);

  return {
    attestationType: AttestationType.BalanceDecreasingTransaction,
    sourceId: sourceId,
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000",   // TODO change
    id,
    inUtxo: toBN(0),
  };
}
