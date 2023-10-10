import { MccClient, ZERO_BYTES_32, prefix0x } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { AttestationDefinitionStore } from "../../external-libs/AttestationDefinitionStore";
import { MIC_SALT, encodeAttestationName } from "../../external-libs/utils";
import { BalanceDecreasingTransaction_Request } from "../../servers/verifier-server/src/dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { verifyBalanceDecreasingTransaction } from "../../servers/verifier-server/src/verification/generic-chain-verifications";
import { AttLogger } from "../../utils/logging/logger";
import { VerificationStatus, WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { IIndexedQueryManager } from "../IIndexedQueryManager";

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
  defStore: AttestationDefinitionStore,
  logger: AttLogger,
  indexedQueryManager: IIndexedQueryManager,
  randomTransaction: DBTransactionBase,
  sourceId: string,
  TransactionClass: new (...args: any[]) => any,
  enforcedChoice?: RandomBalanceDecreasingTransactionChoiceType,
  client?: MccClient
): Promise<BalanceDecreasingTransaction_Request | null> {
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
  const blockNumber = randomTransaction.blockNumber;
  const request = {
    attestationType: encodeAttestationName("BalanceDecreasingTransaction"),
    sourceId,
    messageIntegrityCode: ZERO_BYTES_32,
    requestBody: {
      transactionId: id,
      sourceAddressIndicator: ZERO_BYTES_32
    }
  } as BalanceDecreasingTransaction_Request;
  if (choice === "WRONG_MIC") {
    return request;
  }
  try {
    let response = await verifyBalanceDecreasingTransaction(TransactionClass, request, indexedQueryManager, client);
    if (response.status === VerificationStatus.OK) {
      request.messageIntegrityCode = defStore.attestationResponseHash(response.response, MIC_SALT);
      if (sourceId === "XRP") {
        request.requestBody.sourceAddressIndicator = response.response.responseBody.sourceAddressHash;
      }
      logger.info(`Request augmented correctly (BalanceDecreasingTransaction)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
