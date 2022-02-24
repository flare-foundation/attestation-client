import BN from "bn.js";
import { AdditionalTransactionDetails, toBN, toNumber } from "flare-mcc";
import { extractBNPaymentReference, genericReturnWithStatus } from "../../../../utils/utils";
import { checkDataAvailability } from "../../../attestation-request-utils";
import {
  ChainVerification, DataAvailabilityProof, TransactionAttestationRequest,
  VerificationStatus,
  VerificationTestOptions
} from "../../../attestation-types/attestation-types";

export function verifyPaymentUtxo(
  attRequest: TransactionAttestationRequest,
  additionalData: AdditionalTransactionDetails,
  dataAvailability: DataAvailabilityProof,  
  testOptions?: VerificationTestOptions
): ChainVerification {
  let RET = (status: VerificationStatus) => genericReturnWithStatus(additionalData, attRequest, status);

  // // check against instructions
  // if (!instructionsCheck(additionalData, attRequest)) {
  //   return RET(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
  // }

  // check confirmations
  if (!testOptions?.skipDataAvailabilityProof) {
    let dataAvailabilityVerification = checkDataAvailability(additionalData, dataAvailability, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
      return RET(dataAvailabilityVerification);
    }
  }

  // Extract source address
  let theSource: string | undefined = undefined;
  let allSpentFunds = toBN(0);

  let isSingleSimpleSource = additionalData.sourceAddresses.length > 0; // true until disproved

  for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
    let addressList = additionalData.sourceAddresses[i];
    if (addressList.length !== 1) {
      isSingleSimpleSource = false;
      // return RET(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
    }
    if (addressList[0] === "") {
      isSingleSimpleSource = false;
      // return RET(VerificationStatus.EMPTY_IN_ADDRESS);
    }
    if (!theSource) {
      theSource = addressList[0];
    } else if (theSource.toLowerCase() != addressList[0].toLowerCase()) {
      isSingleSimpleSource = false;
    }
    allSpentFunds = allSpentFunds.add((additionalData.spent as BN[])[i]);
  }
  // if (!theSource) {
  //   return RET(VerificationStatus.EMPTY_IN_ADDRESS);
  // }

  // Extract destination address
  let theDestination: string | undefined = undefined;
  let deliveredFunds = toBN(0); // all delivered
  let totalOutFunds = toBN(0);
  let returnedFunds = toBN(0); // returned if

  // utxo has to be defined

  if (attRequest.utxo == null) {
    return RET(VerificationStatus.MISSING_OUT_UTXO);
  }

  let utxo = toNumber(attRequest.utxo)!;

  if (utxo < 0 || utxo >= additionalData.destinationAddresses.length) {
    return RET(VerificationStatus.WRONG_OUT_UTXO);
  }

  let addressList = additionalData.destinationAddresses[utxo];
  if (!addressList || addressList.length !== 1) {
    return RET(VerificationStatus.UNSUPPORTED_DESTINATION_ADDRESS);
  }

  theDestination = addressList[0];

  for (let i = 0; i < additionalData.destinationAddresses.length; i++) {
    addressList = additionalData.destinationAddresses[i]; // can be undefined, e.g. in case of OP_RETURN
    let destDelivered = (additionalData.delivered as BN[])[i];
    if (addressList && addressList.length === 1) {
      let destAddress = addressList[0].toLowerCase();
      if (destAddress === theDestination.toLowerCase()) {
        deliveredFunds = deliveredFunds.add(destDelivered);
      }
      if (theSource && destAddress === theSource.toLowerCase()) {
        returnedFunds = returnedFunds.add(destDelivered);
      }
    }
    totalOutFunds = totalOutFunds.add(destDelivered);
  }

  // NOTE: in case theSource
  let newAdditionalData = {
    ...additionalData,
    sourceAddresses: theSource,
    destinationAddresses: theDestination,
    spent: allSpentFunds.sub(returnedFunds),
    delivered: deliveredFunds, // just to address address selected by utxo
    fee: allSpentFunds.sub(totalOutFunds),
    paymentReference: extractBNPaymentReference(additionalData.paymentReference!),
    isFromOne: !!theSource,
  } as ChainVerification;

  // new RET
  RET = (status: VerificationStatus) => genericReturnWithStatus(newAdditionalData, attRequest, status);

  return RET(VerificationStatus.OK);
}
