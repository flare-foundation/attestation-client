import { MccClient } from "@flarenetwork/mcc";
import { AttestationDefinitionStore } from "../../external-libs/AttestationDefinitionStore";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName } from "../../external-libs/utils";
import { ConfirmedBlockHeightExists_Request } from "../../servers/verifier-server/src/dtos/attestation-types/ConfirmedBlockHeightExists.dto";
import { verifyConfirmedBlockHeightExists } from "../../servers/verifier-server/src/verification/generic-chain-verifications";
import { AttLogger } from "../../utils/logging/logger";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { IIndexedQueryManager } from "../IIndexedQueryManager";
import { BlockResult } from "../indexed-query-manager-types";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type ConfirmedBlockHeightExists
/////////////////////////////////////////////////////////////////

export type RandomConfirmedBlockHeightExistsChoiceType = "CORRECT" | "WRONG_MIC";

const RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS = [
  { name: "CORRECT", weight: 10 },
  { name: "WRONG_MIC", weight: 1 },
] as WeightedRandomChoice<RandomConfirmedBlockHeightExistsChoiceType>[];

export async function prepareRandomizedRequestConfirmedBlockHeightExists(
  defStore: AttestationDefinitionStore,
  logger: AttLogger,
  indexedQueryManager: IIndexedQueryManager,
  randomBlock: BlockResult,
  sourceId: string,
  TransactionClass: new (...args: any[]) => any,
  enforcedChoice?: RandomConfirmedBlockHeightExistsChoiceType,
  client?: MccClient,
  queryWindow = 100
): Promise<ConfirmedBlockHeightExists_Request | null> {
  if (!randomBlock) {
    return null;
  }

  const choice = enforcedChoice
    ? RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS.find((x) => x.name === enforcedChoice)
    : randomWeightedChoice(RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS);

  if (!choice) {
    return null;
  }

  const blockNumber = randomBlock.blockNumber;
  const request = {
    attestationType: encodeAttestationName("ConfirmedBlockHeightExists"),
    sourceId,
    messageIntegrityCode: ZERO_BYTES_32,
    requestBody: {
      blockNumber: blockNumber.toString(),
      queryWindow: queryWindow.toString(),
    },
  } as ConfirmedBlockHeightExists_Request;
  if (choice === "WRONG_MIC") {
    return request;
  }
  try {
    let response = await verifyConfirmedBlockHeightExists(request, indexedQueryManager);
    if (response.status === "OK") {
      request.messageIntegrityCode = defStore.attestationResponseHash(response.response, MIC_SALT);
      logger.info(`Request augmented correctly (ConfirmedBlockHeightExists)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
