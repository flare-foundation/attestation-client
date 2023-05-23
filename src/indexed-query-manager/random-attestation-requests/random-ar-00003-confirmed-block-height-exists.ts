import { toBN } from "@flarenetwork/mcc";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { AttLogger } from "../../utils/logging/logger";
import { AttestationDefinitionStore } from "../../verification/attestation-types/AttestationDefinitionStore";
import { MIC_SALT, WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { DHConfirmedBlockHeightExists } from "../../verification/generated/attestation-hash-types";
import { ARConfirmedBlockHeightExists } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { verifyAttestation } from "../../verification/verifiers/verifier_routing";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { createTestAttestationFromRequest } from "./random-ar";

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
  indexedQueryManager: IndexedQueryManager,
  randomBlock: DBBlockBase,
  sourceId: SourceId,
  enforcedChoice?: RandomConfirmedBlockHeightExistsChoiceType,
  queryWindow = 100
): Promise<ARConfirmedBlockHeightExists | null> {
  if (!randomBlock) {
    return null;
  }

  const choice = enforcedChoice
    ? RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS.find((x) => x.name === enforcedChoice)
    : randomWeightedChoice(RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS);

  if (!choice) {
    return null;
  }

  const blockNumber = toBN(randomBlock.blockNumber);
  const request = {
    attestationType: AttestationType.ConfirmedBlockHeightExists,
    sourceId,
    messageIntegrityCode: "0x0000000000000000000000000000000000000000000000000000000000000000", // TODO change
    blockNumber,
    queryWindow,
  } as ARConfirmedBlockHeightExists;
  if (choice === "WRONG_MIC") {
    return request;
  }
  let attestation = createTestAttestationFromRequest(defStore, request, 0, logger);
  try {
    let response = await verifyAttestation(defStore, undefined, attestation, indexedQueryManager);
    // augment with message integrity code
    if (response.status === "OK") {
      request.messageIntegrityCode = defStore.dataHash(request, response.response as DHConfirmedBlockHeightExists, MIC_SALT);
      logger.info(`Request augmented correctly (ConfirmedBlockHeightExists)`);
      return request;
    }
  } catch (e) {
    logger.info(`Attestation verification failed: ${e}`);
  }
  return null;
}
