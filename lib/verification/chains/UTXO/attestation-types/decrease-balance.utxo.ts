import BN from "bn.js";
import { AdditionalTransactionDetails } from "../../../../MCC/types";
import { toBN, toNumber } from "../../../../MCC/utils";
import { checkDataAvailability } from "../../../attestation-request-utils";
import { NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus, VerificationTestOptions } from "../../../attestation-types";

export function verifyDecreaseBalanceUtxo(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testOptions?: VerificationTestOptions
) {
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

  // find matching address and calculate funds taken from it
  let sourceIndices: number[] = [];
  let theSource: string | undefined;
  let inFunds = toBN(0);

  if (attRequest.utxo === undefined) {
    return genericReturnWithStatus(VerificationStatus.MISSING_IN_UTXO);
  }
  let inUtxo = toNumber(attRequest.utxo)!;
  if (inUtxo < 0 || inUtxo >= additionalData.sourceAddresses.length) {
    return genericReturnWithStatus(VerificationStatus.WRONG_IN_UTXO);
  }
  let sourceCandidates = additionalData.sourceAddresses[inUtxo!];
  // TODO: handle multisig
  if (sourceCandidates.length != 1) {
    return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
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
    return genericReturnWithStatus(VerificationStatus.FUNDS_UNCHANGED);
  }
  if (returnedFunds.gt(inFunds)) {
    return genericReturnWithStatus(VerificationStatus.FUNDS_INCREASED);
  }

  let newAdditionalData = {
    ...additionalData,
    sourceAddresses: theSource,
    spent: inFunds.sub(returnedFunds),
  } as AdditionalTransactionDetails;

  function newGenericReturnWithStatus(verificationStatus: VerificationStatus) {
    return {
      chainId: toBN(attRequest.chainId),
      attestationType: attRequest.attestationType!,
      ...newAdditionalData,
      verificationStatus,
      utxo: attRequest.utxo,
    } as NormalizedTransactionData;
  }

  // check confirmations
  let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
  if (dataAvailabilityVerification != VerificationStatus.OK) {
    return newGenericReturnWithStatus(dataAvailabilityVerification);
  }

  return newGenericReturnWithStatus(VerificationStatus.OK);
}
