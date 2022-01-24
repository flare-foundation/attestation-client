import { TransactionMetadata, TxResponse } from "xrpl";
import { AdditionalTransactionDetails, ChainType, RPCInterface } from "../../MCC/types";
import { toBN, toNumber, unPrefix0x } from "../../MCC/utils";
import { checkDataAvailability } from "../attestation-request-utils";
import { AttestationType, NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus } from "../attestation-types";
import { numberOfConfirmations } from "../confirmations";

////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationXRP(client: RPCInterface, attRequest: TransactionAttestationRequest, testFailProbability = 0) {
  try {
    let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id))) as TxResponse;
    let additionalData = await client.getAdditionalTransactionDetails({
      transaction: txResponse,
      confirmations: numberOfConfirmations(toNumber(attRequest.chainId) as ChainType),
      dataAvailabilityProof: attRequest.dataAvailabilityProof,
    });
    return checkAndAggregateXRP(additionalData, attRequest, testFailProbability);
  } catch (error) {
    // TODO: handle error
    console.log(error);
    return {} as any;
  }
}

function checkAndAggregateXRP(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testFailProbability = 0
): NormalizedTransactionData {
  // helper return function
  function genericReturnWithStatus(verificationStatus: VerificationStatus) {
    return {
      chainId: toBN(attRequest.chainId),
      attestationType: attRequest.attestationType!,
      ...additionalData,
      verificationStatus,
      utxo: attRequest.utxo,
    } as NormalizedTransactionData;
  }

  // Test simulation of "too early check"
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

  // FassetPaymentProof checks
  if (attRequest.attestationType === AttestationType.FassetPaymentProof) {
    if (transaction.result.TransactionType != "Payment") {
      return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_TX_TYPE);
    }
    if (transaction.result.Account === transaction.result.Destination) {
      return genericReturnWithStatus(VerificationStatus.FORBIDDEN_SELF_SENDING);
    }
    return genericReturnWithStatus(VerificationStatus.OK);
  }

  // BalanceDecreasingProof checks
  if (attRequest.attestationType === AttestationType.BalanceDecreasingProof) {
    return genericReturnWithStatus(VerificationStatus.OK);
  }

  throw new Error(`Wrong or missing attestation type: ${attRequest.attestationType}`);
}

////////////////////////////////////////////////////////////////////////////////////////
// Support
////////////////////////////////////////////////////////////////////////////////////////

export function isSupportedTransactionXRP(transaction: any, attType: AttestationType): boolean {
  if (!(transaction.metaData || transaction.meta)) {
    // console.log("E-1");
    return false;
  }
  if (transaction.TransactionType != "Payment") {
    // console.log("E-2");
    return false;
  }
  let meta = transaction.metaData || transaction.meta;
  if (typeof meta === "string") {
    // console.log("E-3");
    return false;
  }
  if (typeof (meta as TransactionMetadata).delivered_amount != "string") {
    // console.log("E-4");
    return false;
  }
  if (meta!.TransactionResult != "tesSUCCESS") {
    // console.log("E-5");
    return false;
  }
  return true;
}
