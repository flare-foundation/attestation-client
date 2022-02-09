import { AdditionalTransactionDetails } from "flare-mcc";
import { genericReturnWithStatus } from "../../../../utils/utils";
import { checkDataAvailability } from "../../../attestation-request-utils";
import {
   ChainVerification,
   DataAvailabilityProof,
   TransactionAttestationRequest,
   VerificationStatus,
   VerificationTestOptions
} from "../../../attestation-types";

export function verifyBlockHeightXRP(
   attRequest: TransactionAttestationRequest,
   additionalData: any,
   availabilityProof: DataAvailabilityProof,
   testOptions?: VerificationTestOptions
): ChainVerification {
   const RET = (status: VerificationStatus) => genericReturnWithStatus(additionalData, attRequest, status);

   // check confirmations
   if (!testOptions?.skipDataAvailabilityProof) {
      let dataAvailabilityVerification = checkDataAvailability(additionalData, availabilityProof, attRequest);
      if (dataAvailabilityVerification != VerificationStatus.OK) {
         return RET(dataAvailabilityVerification);
      }
   }

   // // check against instructions
   // if (!instructionsCheck(additionalData, attRequest)) {
   //   return RET(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
   // }

   return RET(VerificationStatus.OK);
}
