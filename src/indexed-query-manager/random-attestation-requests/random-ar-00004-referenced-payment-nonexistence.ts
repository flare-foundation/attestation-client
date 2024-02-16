import { MccClient, prefix0x } from "@flarenetwork/mcc";
import Web3 from "web3";
import { AttestationDefinitionStore } from "../../external-libs/AttestationDefinitionStore";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName } from "../../external-libs/utils";
import { ReferencedPaymentNonexistence_Request } from "../../servers/verifier-server/src/dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { verifyReferencedPaymentNonExistence } from "../../servers/verifier-server/src/verification/generic-chain-verifications";
import { AttLogger } from "../../utils/logging/logger";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { IIndexedQueryManager } from "../IIndexedQueryManager";
import { TransactionResult } from "../indexed-query-manager-types";

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
  defStore: AttestationDefinitionStore,
  logger: AttLogger,
  indexedQueryManager: IIndexedQueryManager,
  randomTransaction: TransactionResult,
  sourceId: string,
  TransactionClass: new (...args: any[]) => any,
  enforcedChoice?: RandomReferencedPaymentNonexistenceChoiceType,
  client?: MccClient,
  queryWindow = 100
): Promise<ReferencedPaymentNonexistence_Request | null> {
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

  const deadlineBlockNumber = prevBlockQueryResult.result.blockNumber;
  const deadlineTimestamp = prevBlockQueryResult.result.timestamp;
  const paymentReference = choice === "CORRECT" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.paymentReference);
  // let destinationAmounts = randomTransaction.
  const request = {
    attestationType: encodeAttestationName("ReferencedPaymentNonexistence"),
    sourceId,
    messageIntegrityCode: ZERO_BYTES_32,
    requestBody: {
      minimalBlockNumber: (deadlineBlockNumber - queryWindow).toString(),
      deadlineBlockNumber: deadlineBlockNumber.toString(),
      deadlineTimestamp: deadlineTimestamp.toString(),
      destinationAddressHash: Web3.utils.randomHex(32),
      amount: Web3.utils.randomHex(16),
      standardPaymentReference: paymentReference,
    },
  } as ReferencedPaymentNonexistence_Request;
  if (choice === "WRONG_MIC") {
    return request;
  }
  try {
    let response = await verifyReferencedPaymentNonExistence(TransactionClass, request, indexedQueryManager);
    if (response.status === "OK") {
      request.messageIntegrityCode = defStore.attestationResponseHash(response.response, MIC_SALT);
      logger.info(`Request augmented correctly (ReferencePaymentNonexistence)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
