import { prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { AttLogger } from "../../utils/logging/logger";
import { MIC_SALT, WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { hashBalanceDecreasingTransaction } from "../../verification/generated/attestation-hash-utils";
import { ARBalanceDecreasingTransaction } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { verifyAttestation } from "../../verification/verifiers/verifier_routing";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { createTestAttestationFromRequest } from "./random-ar";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type BalanceDecreasingTransaction
/////////////////////////////////////////////////////////////////

export type RandomBalanceDecreasingTransactionChoiceType = "CORRECT" | "WRONG_MIC" | "NON_EXISTENT_TX_ID";

const RANDOM_OPTIONS_BALANCE_DECREASING_TRANSACTION = [
  { name: "CORRECT", weight: 10 },
  { name: "WRONG_MIC", weight: 1 },
  { name: "NON_EXISTENT_TX_ID", weight: 1 },
] as WeightedRandomChoice<RandomBalanceDecreasingTransactionChoiceType>[];

export async function prepareRandomizedRequestBalanceDecreasingTransaction(
  logger: AttLogger,
  indexedQueryManager: IndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: SourceId,
  enforcedChoice?: RandomBalanceDecreasingTransactionChoiceType
): Promise<ARBalanceDecreasingTransaction | null> {
  if (!randomTransaction) {
    return null;
  }

  const choice = enforcedChoice
    ? RANDOM_OPTIONS_BALANCE_DECREASING_TRANSACTION.find((x) => x.name === enforcedChoice)
    : randomWeightedChoice(RANDOM_OPTIONS_BALANCE_DECREASING_TRANSACTION);

  if (!choice) {
    return null;
  }

  const id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.transactionId);

  const request = {
    attestationType: AttestationType.BalanceDecreasingTransaction,
    sourceId: sourceId,
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000", // TODO change
    id,
    inUtxo: toBN(0),
  } as ARBalanceDecreasingTransaction;
  if (choice === "WRONG_MIC") {
    return request;
  }
  let attestation = createTestAttestationFromRequest(request, 0);
  try {
    let response = await verifyAttestation(undefined, attestation, indexedQueryManager);
    // augment with message integrity code
    if (response.status === "OK") {
      request.messageIntegrityCode = hashBalanceDecreasingTransaction(request, response.response, MIC_SALT);
      logger.info(`Request augmented correctly (BalanceDecreasingTransaction)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
