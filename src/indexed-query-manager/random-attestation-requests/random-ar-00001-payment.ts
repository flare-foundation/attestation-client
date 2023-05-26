import { MccClient, prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { AttLogger } from "../../utils/logging/logger";
import { AttestationDefinitionStore } from "../../verification/attestation-types/AttestationDefinitionStore";
import { MIC_SALT, WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { DHPayment } from "../../verification/generated/attestation-hash-types";
import { ARPayment } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { verifyAttestation } from "../../verification/verifiers/verifier_routing";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { createTestAttestationFromRequest } from "./random-ar";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type Payment
/////////////////////////////////////////////////////////////////

export type RandomPaymentChoiceType = "CORRECT" | "WRONG_MIC" | "NON_EXISTENT_TX_ID";
const RANDOM_OPTIONS_PAYMENT = [
  { name: "CORRECT", weight: 10 },
  { name: "WRONG_MIC", weight: 1 },
  { name: "NON_EXISTENT_TX_ID", weight: 1 },
] as WeightedRandomChoice<RandomPaymentChoiceType>[];

export async function prepareRandomizedRequestPayment(
  defStore: AttestationDefinitionStore,
  logger: AttLogger,
  indexedQueryManager: IndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: SourceId,
  enforcedChoice?: RandomPaymentChoiceType,
  client?: MccClient
): Promise<ARPayment | null> {
  if (!randomTransaction) {
    return null;
  }

  const choice = enforcedChoice ? RANDOM_OPTIONS_PAYMENT.find((x) => x.name === enforcedChoice) : randomWeightedChoice(RANDOM_OPTIONS_PAYMENT);

  if (!choice) {
    return null;
  }
  const id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.transactionId);
  const blockNumber = randomTransaction.blockNumber;
  const request = {
    attestationType: AttestationType.Payment,
    sourceId: sourceId,
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000", // TODO change
    id,
    blockNumber,
    utxo: toBN(0), // TODO: randomize for UTXO chains
    inUtxo: toBN(0), // TODO: randomize for UTXO chains
  } as ARPayment;
  if (choice === "WRONG_MIC") {
    return request;
  }
  let attestation = createTestAttestationFromRequest(defStore, request, 0, logger);
  try {
    let response = await verifyAttestation(defStore, client, attestation, indexedQueryManager);
    // augment with message integrity code
    if (response.status === "OK") {
      request.messageIntegrityCode = defStore.dataHash(request, response.response as DHPayment, MIC_SALT);
      logger.info(`Request augmented correctly (Payment)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
