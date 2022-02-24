import BN from "bn.js";
import { AdditionalTransactionDetails, toBN, toNumber } from "flare-mcc";
import { genericReturnWithStatus } from "../../../../utils/utils";
import { checkDataAvailability } from "../../../attestation-request-utils";
import {
  ChainVerification, DataAvailabilityProof, TransactionAttestationRequest,
  VerificationStatus,
  VerificationTestOptions
} from "../../../attestation-types/attestation-types";

export function verifyDecreaseBalanceUtxo(
  attRequest: TransactionAttestationRequest,
  additionalData: AdditionalTransactionDetails,
  availabilityProof: DataAvailabilityProof,  
  testOptions?: VerificationTestOptions
) {
  let RET = (status: VerificationStatus) => genericReturnWithStatus(additionalData, attRequest, status);

  // // check against instructions
  // if (!instructionsCheck(additionalData, attRequest)) {
  //   return RET(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
  // }

  // find matching address and calculate funds taken from it
  let sourceIndices: number[] = [];
  let theSource: string | undefined;
  let inFunds = toBN(0);

  if (attRequest.utxo === undefined) {
    return RET(VerificationStatus.MISSING_IN_UTXO);
  }
  let inUtxo = toNumber(attRequest.utxo)!;
  if (inUtxo < 0 || inUtxo >= additionalData.sourceAddresses.length) {
    return RET(VerificationStatus.WRONG_IN_UTXO);
  }
  let sourceCandidates = additionalData.sourceAddresses[inUtxo!];
  // TODO: handle multisig
  if (sourceCandidates.length != 1) {
    return RET(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
  }

  theSource = sourceCandidates[0];

  // Calculate in funds
  for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
    let sources = additionalData.sourceAddresses[i];
    // TODO: Handle multisig addresses
    if (sources.length != 1) {
      continue;
    }
    let aSource = sources[0];
    if (aSource === theSource) {
      sourceIndices.push(i);
      inFunds = inFunds.add((additionalData.spent as BN[])[i]);
    }
  }

  // calculate returned funds
  let returnedFunds = toBN(0);
  for (let i = 0; i < additionalData.destinationAddresses.length; i++) {
    let destination = additionalData.destinationAddresses[i];
    // TODO: handle multisig given source address?
    if (destination.length != 1) {
      continue;
    }
    if (destination[0] === theSource) {
      let destDelivered = (additionalData.delivered as BN[])[i];
      returnedFunds = returnedFunds.add(destDelivered);
    }
  }

  if (returnedFunds.eq(inFunds)) {
    return RET(VerificationStatus.FUNDS_UNCHANGED);
  }
  if (returnedFunds.gt(inFunds)) {
    return RET(VerificationStatus.FUNDS_INCREASED);
  }

  let newAdditionalData = {
    ...additionalData,
    sourceAddresses: theSource,
    spent: inFunds.sub(returnedFunds),
  } as ChainVerification;

  // redefine RET
  RET = (status: VerificationStatus) => genericReturnWithStatus(newAdditionalData, attRequest, status);

  // check confirmations
  if (!testOptions?.skipDataAvailabilityProof) {
    let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, availabilityProof, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
      return RET(dataAvailabilityVerification);
    }
  }

  return RET(VerificationStatus.OK);
}
