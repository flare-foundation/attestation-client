import { AdditionalTransactionDetails } from "flare-mcc";
import { genericReturnWithStatus } from "../../../../utils/utils";
import { checkDataAvailability, instructionsCheck } from "../../../attestation-request-utils";
import {
  DataAvailabilityProof,
  NormalizedTransactionData,
  TransactionAttestationRequest,
  VerificationStatus,
  VerificationTestOptions
} from "../../../attestation-types";

export function verifyDecreaseBalanceXRP(
  additionalData: AdditionalTransactionDetails,
  availabilityProof: DataAvailabilityProof,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {

  const RET = (status: VerificationStatus) => genericReturnWithStatus(additionalData, attRequest, status);

  // check confirmations
  if (!testOptions?.skipDataAvailabilityProof) {
    let dataAvailabilityVerification = checkDataAvailability(additionalData, availabilityProof, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
      return RET(dataAvailabilityVerification);
    }
  }

  // check against instructions
  if (!instructionsCheck(additionalData, attRequest)) {
    return RET(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
  }

  return RET(VerificationStatus.OK);

}
