import { prefix0x, toBN } from "flare-mcc";
import Web3 from "web3";
import { DBTransactionBase } from "../../entity/dbTransaction";
import { WeightedRandomChoice } from "../../verification/attestation-types/attestation-types";
import { randomWeightedChoice } from "../../verification/attestation-types/attestation-types-helpers";
import { ARReferencedPaymentNonexistence } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { getRandomTransactionWithPaymentReference } from "../indexed-query-manager-utils";
import { IndexedQueryManager } from "../IndexedQueryManager";

export type RandomReferencedPaymentNonexistenceChoiceType = "CORRECT" | "EXISTS" | "WRONG_DATA_AVAILABILITY_PROOF";

const RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE = [
   { name: "CORRECT", weight: 10 },
   { name: "EXISTS", weight: 1 },
   { name: "WRONG_DATA_AVAILABILITY_PROOF", weight: 1 },
] as WeightedRandomChoice<RandomReferencedPaymentNonexistenceChoiceType>[]

export async function getRandomRequestReferencedPaymentNonexistence(
   indexedQueryManager: IndexedQueryManager,
   sourceId: SourceId,
   roundId: number,
   numberOfConfirmations: number,
   transaction?: DBTransactionBase,
   enforcedChoice?: RandomReferencedPaymentNonexistenceChoiceType
): Promise<ARReferencedPaymentNonexistence | null> {

   const OVERFLOW_BLOCK_OFFSET = 10;

   let randomTransaction = transaction
      ? transaction
      : await getRandomTransactionWithPaymentReference(indexedQueryManager);

   let overflowBlockNum = randomTransaction.blockNumber + OVERFLOW_BLOCK_OFFSET;

   let blockOverflow = await indexedQueryManager.queryBlock({
      blockNumber: overflowBlockNum,
      confirmed: true,
      roundId
   });
   if (!blockOverflow) {
      return null;
   }

   let choice = enforcedChoice
      ? RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE.find(x => x.name === enforcedChoice)
      : randomWeightedChoice(RANDOM_OPTIONS_REFERENCED_PAYMENT_NONEXISTENCE);

   if (!choice) {
      return null;
   }

   let prevBlockIndex = overflowBlockNum - 1;
   let prevBlock = await indexedQueryManager.queryBlock({
      blockNumber: prevBlockIndex,
      confirmed: true,
      roundId
   });
   while (prevBlock.timestamp === blockOverflow.timestamp) {
      prevBlockIndex--;
      prevBlock = await indexedQueryManager.queryBlock({
         blockNumber: prevBlockIndex,
         confirmed: true,
         roundId
      });
   }

   let confirmationBlock = await indexedQueryManager.queryBlock({
      blockNumber: overflowBlockNum + numberOfConfirmations,
      roundId
   });

   if (!confirmationBlock) {
      return null;
   }

   let endBlock = toBN(prevBlock.blockNumber);
   let endTimestamp = toBN(prevBlock.timestamp);
   let overflowBlock = overflowBlockNum;
   let dataAvailabilityProof = choice === "WRONG_DATA_AVAILABILITY_PROOF" ? Web3.utils.randomHex(32) : prefix0x(confirmationBlock.blockHash);
   let paymentReference = choice === "CORRECT" ? Web3.utils.randomHex(32) : randomTransaction.paymentReference;
   // TODO
   // let destinationAmounts = randomTransaction.
   return {
      attestationType: AttestationType.ReferencedPaymentNonexistence,
      sourceId,
      endTimestamp,
      endBlock,
      destinationAddress: Web3.utils.randomHex(32),
      amount: toBN(Web3.utils.randomHex(16)),
      paymentReference,
      overflowBlock,
      dataAvailabilityProof
   };

}
