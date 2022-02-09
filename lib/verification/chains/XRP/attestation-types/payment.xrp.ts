import { AdditionalTransactionDetails } from "flare-mcc";
import { TxResponse } from "xrpl";
import { genericReturnWithStatus } from "../../../../utils/utils";
import { checkDataAvailability } from "../../../attestation-request-utils";
import {
  ChainVerification, 
  DataAvailabilityProof, 
  TransactionAttestationRequest,
  VerificationStatus,
  VerificationTestOptions
} from "../../../attestation-types";

export function verifyPaymentXRP(
   attRequest: TransactionAttestationRequest,
  additionalData: AdditionalTransactionDetails,
  availabilityProof: DataAvailabilityProof,
  testOptions?: VerificationTestOptions
): ChainVerification {
  // helper return function

  const RET = (status: VerificationStatus) =>
    genericReturnWithStatus(additionalData, attRequest, status, {
      dataAvailabiltyProof: availabilityProof.hash,
      isFromOne: true,
      utxo: 0,
    });

  // check if payment
  let transaction = additionalData.transaction as TxResponse;
  if (transaction.result.TransactionType != "Payment") {
    return RET(VerificationStatus.UNSUPPORTED_TX_TYPE);
  }

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
