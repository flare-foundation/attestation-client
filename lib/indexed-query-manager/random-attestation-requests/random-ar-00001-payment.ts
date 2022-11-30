import { prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { ARPayment } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { IndexedQueryManager } from "../IndexedQueryManager";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type Payment
/////////////////////////////////////////////////////////////////

export type RandomPaymentChoiceType = "CORRECT" | "WRONG_DATA_AVAILABILITY_PROOF" | "NON_EXISTENT_TX_ID";
const RANDOM_OPTIONS_PAYMENT = [
  { name: "CORRECT", weight: 10 },
  { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
  { name: "NON_EXISTENT_TX_ID", weight: 1 },
] as WeightedRandomChoice<RandomPaymentChoiceType>[];

export async function prepareRandomizedRequestPayment(
  indexedQueryManager: IndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: SourceId,
  roundId: number,
  numberOfConfirmations: number,
  enforcedChoice?: RandomPaymentChoiceType
): Promise<ARPayment | null> {
  if (!randomTransaction) {
    return null;
  }
  const confirmationBlockQueryResponse = await indexedQueryManager.queryBlock({
    blockNumber: randomTransaction.blockNumber + numberOfConfirmations,
    roundId,
  });
  if (!confirmationBlockQueryResponse?.result) {
    return null;
  }

  const choice = enforcedChoice ? RANDOM_OPTIONS_PAYMENT.find((x) => x.name === enforcedChoice) : randomWeightedChoice(RANDOM_OPTIONS_PAYMENT);

  if (!choice) {
    return null;
  }
  const id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.transactionId);
  const upperBoundProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlockQueryResponse.result.blockHash);
  return {
    attestationType: AttestationType.Payment,
    sourceId: sourceId,
    upperBoundProof,
    id,
    utxo: toBN(0), // TODO: randomize for UTXO chains
    inUtxo: toBN(0), // TODO: randomize for UTXO chains
  };
}
