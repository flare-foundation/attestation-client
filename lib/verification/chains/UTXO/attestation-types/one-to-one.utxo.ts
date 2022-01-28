import BN from "bn.js";
import { AdditionalTransactionDetails, toBN } from "flare-mcc";
import { checkDataAvailability } from "../../../attestation-request-utils";
import { NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "../../../attestation-types";

export function verifyOneToOneUtxo(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
): NormalizedTransactionData {
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

  // check against instructions
  // if (!instructionsCheck(additionalData, attRequest)) {
  //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
  // }
  // Extract source address
  //   if (attRequest.utxo === undefined) {
  //     return genericReturnWithStatus(VerificationStatus.MISSING_IN_UTXO);
  //   }
  let theSource: string | undefined = undefined;
  let inFunds = toBN(0);
  for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
    let addressList = additionalData.sourceAddresses[i];
    if (addressList.length !== 1) {
      return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
    }
    if (addressList[0] === "") {
      return genericReturnWithStatus(VerificationStatus.EMPTY_IN_ADDRESS);
    }
    if (theSource && addressList[0] != theSource) {
      return genericReturnWithStatus(VerificationStatus.NOT_SINGLE_SOURCE_ADDRESS);
    }
    theSource = addressList[0];
    inFunds = inFunds.add((additionalData.spent as BN[])[i]);
  }
  if (!theSource) {
    return genericReturnWithStatus(VerificationStatus.EMPTY_IN_ADDRESS);
  }

  let theDestination: string | undefined = undefined;
  let outFunds = toBN(0);
  let returnedFunds = toBN(0);

  for (let i = 0; i < additionalData.destinationAddresses.length; i++) {
    let addressList = additionalData.destinationAddresses[i];
    if (!addressList || addressList.length !== 1) {
      return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_DESTINATION_ADDRESS);
    }
    let destAddress = addressList[0];
    if (destAddress === "") {
      return genericReturnWithStatus(VerificationStatus.EMPTY_OUT_ADDRESS);
    }
    let destDelivered = (additionalData.delivered as BN[])[i];
    if (destAddress === theSource) {
      returnedFunds = returnedFunds.add(destDelivered);
    } else {
      if (theDestination && theDestination != destAddress) {
        return genericReturnWithStatus(VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS);
      }
      theDestination = destAddress;
      outFunds = outFunds.add(destDelivered);
    }
  }
  if (!theDestination && returnedFunds.gt(toBN(0))) {
    theDestination = theSource;
  }

  let newAdditionalData = {
    ...additionalData,
    sourceAddresses: theSource,
    destinationAddresses: theDestination,
    spent: inFunds.sub(returnedFunds),
    delivered: outFunds,
    fee: inFunds.sub(outFunds),
  } as AdditionalTransactionDetails;

  function newGenericReturnWithStatus(verificationStatus: VerificationStatus) {
    return {
      chainId: toBN(attRequest.chainId),
      attestationType: attRequest.attestationType!,
      ...newAdditionalData,
      verificationStatus,
      // utxo: attRequest.utxo,
    } as NormalizedTransactionData;
  }

  // check confirmations
  if (!testOptions?.getAvailabilityProof) {
    let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
      return newGenericReturnWithStatus(dataAvailabilityVerification);
    }
  }
  return newGenericReturnWithStatus(VerificationStatus.OK);
}
