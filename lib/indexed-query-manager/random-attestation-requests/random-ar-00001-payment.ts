import { prefix0x, toBN } from "flare-mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/dbTransaction";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { ARPayment } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { IndexedQueryManager } from "../IndexedQueryManager";

/////////////////////////////////////////////////////////////////
// Specific random attestation generators for attestation types
/////////////////////////////////////////////////////////////////

export type RandomPaymentChoiceType = "CORRECT" | "WRONG_DATA_AVAILABILITY_PROOF" | "WRONG_BLOCK_NUMBER" | "NON_EXISTENT_TX_ID";
const RANDOM_OPTIONS_PAYMENT = [
   { name: "CORRECT", weight: 10 },
   { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
   { name: "WRONG_BLOCK_NUMBER", weight: 1 },
   { name: "NON_EXISTENT_TX_ID", weight: 1 }
] as WeightedRandomChoice<RandomPaymentChoiceType>[]

export async function prepareRandomizedRequestPayment(
   indexedQueryManager: IndexedQueryManager,
   randomTransaction: DBTransactionBase,
   sourceId: SourceId,
   roundId: number,
   numberOfConfirmations: number,
   enforcedChoice?: RandomPaymentChoiceType
): Promise<ARPayment | null> {

   if (!randomTransaction) {
      return null;
   }
   let confirmationBlock = await indexedQueryManager.queryBlock({
      blockNumber: randomTransaction.blockNumber + numberOfConfirmations,
      roundId
   })
   if (!confirmationBlock) {
      return null;
   }

   let choice = enforcedChoice
      ? RANDOM_OPTIONS_PAYMENT.find(x => x.name === enforcedChoice)
      : randomWeightedChoice(RANDOM_OPTIONS_PAYMENT);

   if (!choice) {
      return null;
   }
   let id = choice === "NON_EXISTENT_TX_ID" ? Web3.utils.randomHex(32) : prefix0x(randomTransaction.transactionId);
   let blockNumber = choice === "WRONG_BLOCK_NUMBER" ? toBN(randomTransaction.blockNumber - 1) : toBN(randomTransaction.blockNumber);
   let dataAvailabilityProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlock.blockHash);
   return {
      attestationType: AttestationType.Payment,
      sourceId: sourceId,
      blockNumber,
      utxo: toBN(0),  // TODO: randomize for UTXO chains
      inUtxo: toBN(0), // TODO: randomize for UTXO chains
      id,
      dataAvailabilityProof
   };
}


