import { prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { AttLogger } from "../../utils/logging/logger";
import { MIC_SALT, WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { DHReferencedPaymentNonexistence } from "../../verification/generated/attestation-hash-types";
import { hashReferencedPaymentNonexistence } from "../../verification/generated/attestation-hash-utils";
import { ARReferencedPaymentNonexistence } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { verifyAttestation } from "../../verification/verifiers/verifier_routing";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { createTestAttestationFromRequest } from "./random-ar";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type ReferencedPaymentNonexistence
/////////////////////////////////////////////////////////////////

export type RandomReferencedPaymentNonexistenceChoiceType = "CORRECT" | "EXISTS" | "WRONG_MIC";

const RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE = [
  { name: "CORRECT", weight: 10 },
  { name: "EXISTS", weight: 1 },
  { name: "WRONG_MIC", weight: 1 },
] as WeightedRandomChoice<RandomReferencedPaymentNonexistenceChoiceType>[];

export async function prepareRandomizedRequestReferencedPaymentNonexistence(
  logger: AttLogger,
  indexedQueryManager: IndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: SourceId,
  enforcedChoice?: RandomReferencedPaymentNonexistenceChoiceType,
  queryWindow = 100
): Promise<ARReferencedPaymentNonexistence | null> {
  const OVERFLOW_BLOCK_OFFSET = 10;

  const overflowBlockNum = randomTransaction.blockNumber + OVERFLOW_BLOCK_OFFSET;

  const blockOverflowQueryResult = await indexedQueryManager.queryBlock({
    blockNumber: overflowBlockNum,
    confirmed: true,
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
  });
  while (prevBlockQueryResult.result.timestamp === blockOverflowQueryResult.result.timestamp) {
    prevBlockIndex--;
    prevBlockQueryResult = await indexedQueryManager.queryBlock({
      blockNumber: prevBlockIndex,
      confirmed: true,
    });
  }

  // const confirmationBlockQueryResult = await indexedQueryManager.queryBlock({
  //   blockNumber: overflowBlockNum + indexedQueryManager.settings.numberOfConfirmations(),
  // });

  // if (!confirmationBlockQueryResult.result) {
  //   console.log("No confirmation block");
  //   return null;
  // }

  const deadlineBlockNumber = toBN(prevBlockQueryResult.result.blockNumber);
  const deadlineTimestamp = toBN(prevBlockQueryResult.result.timestamp);
  const paymentReference = choice === "CORRECT" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.paymentReference);
  // TODO
  // let destinationAmounts = randomTransaction.
  const request = {
    attestationType: AttestationType.ReferencedPaymentNonexistence,
    sourceId,
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000", // TODO change
    minimalBlockNumber: deadlineBlockNumber.toNumber() - queryWindow,
    deadlineBlockNumber,
    deadlineTimestamp,
    destinationAddressHash: Web3.utils.randomHex(32), // TODO: "CORRECT" does not work here
    amount: toBN(Web3.utils.randomHex(16)), // TODO: "CORRECT" does not work here
    paymentReference,
  };
  if (choice === "WRONG_MIC") {
    return request;
  }
  let attestation = createTestAttestationFromRequest(request, 0);
  try {
    let response = await verifyAttestation(undefined, attestation, indexedQueryManager);
    // augment with message integrity code
    if (response.status === "OK") {
      request.messageIntegrityCode = hashReferencedPaymentNonexistence(request, response.response as DHReferencedPaymentNonexistence, MIC_SALT);
      logger.info(`Request augmented correctly (ReferencePaymentNonexistence)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
