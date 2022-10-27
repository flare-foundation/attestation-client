import { prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { ARReferencedPaymentNonexistence } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { IndexedQueryManager } from "../IndexedQueryManager";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type ReferencedPaymentNonexistence
/////////////////////////////////////////////////////////////////

export type RandomReferencedPaymentNonexistenceChoiceType = "CORRECT" | "EXISTS" | "WRONG_DATA_AVAILABILITY_PROOF";

const RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE = [
  { name: "CORRECT", weight: 10 },
  { name: "EXISTS", weight: 1 },
  { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
] as WeightedRandomChoice<RandomReferencedPaymentNonexistenceChoiceType>[];

export async function prepareRandomizedRequestReferencedPaymentNonexistence(
  indexedQueryManager: IndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: SourceId,
  roundId: number,
  numberOfConfirmations: number,
  enforcedChoice?: RandomReferencedPaymentNonexistenceChoiceType
): Promise<ARReferencedPaymentNonexistence | null> {
  const OVERFLOW_BLOCK_OFFSET = 10;

  const overflowBlockNum = randomTransaction.blockNumber + OVERFLOW_BLOCK_OFFSET;

  const blockOverflowQueryResult = await indexedQueryManager.queryBlock({
    blockNumber: overflowBlockNum,
    confirmed: true,
    roundId,
  });
  if (!blockOverflowQueryResult?.result) {
    console.log("No overflow block");
    return null;
  }

  const choice = enforcedChoice
    ? RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE.find((x) => x.name === enforcedChoice)
    : randomWeightedChoice(RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE);

  if (!choice) {
    console.log("No choice");
    return null;
  }

  let prevBlockIndex = overflowBlockNum - 1;
  let prevBlockQueryResult = await indexedQueryManager.queryBlock({
    blockNumber: prevBlockIndex,
    confirmed: true,
    roundId,
  });
  while (prevBlockQueryResult.result.timestamp === blockOverflowQueryResult.result.timestamp) {
    prevBlockIndex--;
    prevBlockQueryResult = await indexedQueryManager.queryBlock({
      blockNumber: prevBlockIndex,
      confirmed: true,
      roundId,
    });
  }

  const confirmationBlockQueryResult = await indexedQueryManager.queryBlock({
    blockNumber: overflowBlockNum + numberOfConfirmations,
    roundId,
  });

  if (!confirmationBlockQueryResult.result) {
    console.log("No confirmation block");
    return null;
  }

  const deadlineBlockNumber = toBN(prevBlockQueryResult.result.blockNumber);
  const deadlineTimestamp = toBN(prevBlockQueryResult.result.timestamp);
  const overflowBlock = overflowBlockNum;
  const upperBoundProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlockQueryResult.result.blockHash);
  const paymentReference = choice === "CORRECT" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.paymentReference);
  // TODO
  // let destinationAmounts = randomTransaction.
  return {
    attestationType: AttestationType.ReferencedPaymentNonexistence,
    sourceId,
    upperBoundProof,
    deadlineBlockNumber,
    deadlineTimestamp,
    destinationAddressHash: Web3.utils.randomHex(32),
    amount: toBN(Web3.utils.randomHex(16)),
    paymentReference,
  };
}
