import { prefix0x, toBN } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { ARConfirmedBlockHeightExists } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { IndexedQueryManager } from "../IndexedQueryManager";

/////////////////////////////////////////////////////////////////
// Specific random attestation request generators for
// attestation type ConfirmedBlockHeightExists
/////////////////////////////////////////////////////////////////

export type RandomConfirmedBlockHeightExistsChoiceType = "CORRECT" | "WRONG_DATA_AVAILABILITY_PROOF";

const RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS = [
  { name: "CORRECT", weight: 10 },
  { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
] as WeightedRandomChoice<RandomConfirmedBlockHeightExistsChoiceType>[];

export async function prepareRandomizedRequestConfirmedBlockHeightExists(
  indexedQueryManager: IndexedQueryManager,
  randomBlock: DBBlockBase,
  sourceId: SourceId,
  roundId: number,
  numberOfConfirmations: number,
  enforcedChoice?: RandomConfirmedBlockHeightExistsChoiceType
): Promise<ARConfirmedBlockHeightExists | null> {
  if (!randomBlock) {
    return null;
  }
  const confirmationBlockQueryResult = await indexedQueryManager.queryBlock({
    blockNumber: randomBlock.blockNumber + numberOfConfirmations,
    roundId,
  });
  if (!confirmationBlockQueryResult?.result) {
    return null;
  }

  const choice = enforcedChoice
    ? RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS.find((x) => x.name === enforcedChoice)
    : randomWeightedChoice(RANDOM_OPTIONS_CONFIRMED_BLOCK_HEIGHT_EXISTS);

  if (!choice) {
    return null;
  }

  const blockNumber = toBN(randomBlock.blockNumber);
  const upperBoundProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlockQueryResult.result.blockHash);
  return {
    attestationType: AttestationType.ConfirmedBlockHeightExists,
    sourceId,
    upperBoundProof,
  };
}
