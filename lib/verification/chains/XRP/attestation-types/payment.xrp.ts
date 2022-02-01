import { AdditionalTransactionDetails, toBN } from "flare-mcc";
import { TxResponse } from "xrpl";
import { checkDataAvailability } from "../../../attestation-request-utils";
import {
  NormalizedTransactionData,
  TransactionAttestationRequest,
  VerificationStatus,
  VerificationTestOptions
} from "../../../attestation-types";

export function verifyPaymentXRP(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {
  // helper return function
  function genericReturnWithStatus(verificationStatus: VerificationStatus) {
    return {
      chainId: toBN(attRequest.chainId),
      attestationType: attRequest.attestationType!,
      ...additionalData,
      verificationStatus,
      // utxo: attRequest.utxo,
    } as NormalizedTransactionData;
  }

  // Test simulation of "too early check"
  let testFailProbability = testOptions?.testFailProbability || 0;
  if (testFailProbability > 0) {
    if (Math.random() < testFailProbability) {
      return genericReturnWithStatus(VerificationStatus.RECHECK_LATER);
    }
  }

  // check confirmations
  let dataAvailabilityVerification = checkDataAvailability(additionalData, attRequest);
  if (dataAvailabilityVerification != VerificationStatus.OK) {
    return genericReturnWithStatus(dataAvailabilityVerification);
  }

  // check against instructions
  // if (!instructionsCheck(additionalData, attRequest)) {
  //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
  // }

  let transaction = additionalData.transaction as TxResponse;
  ///// Specific checks for attestation types

  if (transaction.result.TransactionType != "Payment") {
    return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_TX_TYPE);
  }
  if (transaction.result.Account === transaction.result.Destination) {
    return genericReturnWithStatus(VerificationStatus.FORBIDDEN_SELF_SENDING);
  }
  return genericReturnWithStatus(VerificationStatus.OK);

  throw new Error(`Wrong or missing attestation type: ${attRequest.attestationType}`);
}
