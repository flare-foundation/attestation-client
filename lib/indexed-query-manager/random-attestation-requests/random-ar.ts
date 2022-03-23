import { ChainType } from "flare-mcc";
import { Attestation } from "../../attester/Attestation";
import { AttestationData } from "../../attester/AttestationData";
import { AttestationTypeScheme } from "../../verification/attestation-types/attestation-types";
import { encodeRequest } from "../../verification/generated/attestation-request-encode";
import { ARType } from "../../verification/generated/attestation-request-types";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { IndexedQueryManager } from "../IndexedQueryManager";
import { getRandomRequestPayment } from "./random-ar-00001-payment";
import { getRandomRequestBalanceDecreasingTransaction } from "./random-ar-00002-balance-decreasing-transaction";
import { getRandomRequestConfirmedBlockHeightExists } from "./random-ar-00003-confirmed-block-height-exists";
import { getRandomRequestReferencedPaymentNonexistence } from "./random-ar-00004-referenced-payment-nonexistence";


export async function getRandomAttestationRequest(
   definitions: AttestationTypeScheme[],
   indexedQueryManager: IndexedQueryManager,
   sourceId: SourceId,
   roundId: number,
   numberOfConfirmations: number
) {
   let randN = Math.floor(Math.random() * definitions.length);
   let scheme = definitions[randN];
   let attestationType = scheme.id as AttestationType;
   switch (attestationType) {
      case AttestationType.Payment:
         return getRandomRequestPayment(indexedQueryManager, sourceId, roundId, numberOfConfirmations);
      case AttestationType.BalanceDecreasingTransaction:
         return getRandomRequestBalanceDecreasingTransaction(indexedQueryManager, sourceId, roundId, numberOfConfirmations);
      case AttestationType.ConfirmedBlockHeightExists:
         return getRandomRequestConfirmedBlockHeightExists(indexedQueryManager, sourceId, roundId, numberOfConfirmations);
      case AttestationType.ReferencedPaymentNonexistence:
         return getRandomRequestReferencedPaymentNonexistence(indexedQueryManager, sourceId, roundId, numberOfConfirmations);
      default:
         throw new Error("Invalid attestation type");
   }
}


export function createTestAttestationFromRequest(
   request: ARType,
   roundId: number,
   numberOfConfirmations: number
): Attestation {
   let data = new AttestationData();
   data.type = request.attestationType;
   data.sourceId = request.sourceId;
   data.request = encodeRequest(request);
   let attestation = new Attestation(undefined, data, undefined);
   attestation.setTestNumberOfConfirmationBlocks(numberOfConfirmations);
   attestation.setTestRoundId(roundId);
   return attestation;
}