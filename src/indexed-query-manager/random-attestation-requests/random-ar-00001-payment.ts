import { MccClient, prefix0x } from "@flarenetwork/mcc";
import Web3 from "web3";
import { AttestationDefinitionStore } from "../../external-libs/AttestationDefinitionStore";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName } from "../../external-libs/utils";
import { Payment_Request } from "../../servers/verifier-server/src/dtos/attestation-types/Payment.dto";
import { verifyPayment } from "../../servers/verifier-server/src/verification/generic-chain-verifications";
import { AttLogger } from "../../utils/logging/logger";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { IIndexedQueryManager } from "../IIndexedQueryManager";
import { TransactionResult } from "../indexed-query-manager-types";

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
  indexedQueryManager: IIndexedQueryManager,
  randomTransaction: TransactionResult,
  sourceId: string,
  TransactionClass: new (...args: any[]) => any,
  enforcedChoice?: RandomPaymentChoiceType,
  client?: MccClient
): Promise<Payment_Request | null> {
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
    attestationType: encodeAttestationName("Payment"),
    sourceId: encodeAttestationName(sourceId),
    messageIntegrityCode: ZERO_BYTES_32, // TODO change,
    requestBody: {
      transactionId: id,
      blockNumber: blockNumber,
      utxo: "0", // TODO: randomize for UTXO chains
      inUtxo: "0", // TODO: randomize for UTXO chains
    },
  } as Payment_Request;
  if (choice === "WRONG_MIC") {
    return request;
  }
  try {
    let response = await verifyPayment(TransactionClass, request, indexedQueryManager);
    if (response.status === "OK") {
      request.messageIntegrityCode = defStore.attestationResponseHash(response.response, MIC_SALT);
      logger.info(`Request augmented correctly (Payment)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
