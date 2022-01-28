import BN from "bn.js";
import { AdditionalTransactionDetails, toBN, toNumber } from "flare-mcc";
import Web3 from "web3";
import {
  AttestationRequest,
  AttestationType,
  attestationTypeEncodingScheme,
  ATT_BITS,
  NormalizedTransactionData,
  TransactionAttestationRequest,
  VerificationStatus,
} from "./attestation-types";
import { numberOfConfirmations } from "./confirmations";

export function txAttReqToAttestationRequest(request: TransactionAttestationRequest): AttestationRequest {
  let scheme = attestationTypeEncodingScheme(request.attestationType!);
  return {
    instructions: encodeToUint256(scheme.sizes, scheme.keys, {
      attestationType: toBN(request.attestationType as number),
      chainId: toBN(request.chainId),
      blockNumber: toBN(request.blockNumber),
      utxo: request.utxo === undefined ? undefined : toBN(request.utxo),
    }),
    id: request.id,
    dataAvailabilityProof: request.dataAvailabilityProof,
  } as AttestationRequest;
}

function getAttestationTypeFromInstructions(request: AttestationRequest): AttestationType {
  let typeData = decodeUint256(request.instructions, [ATT_BITS, 256 - ATT_BITS], ["attestationType", ""]);
  return typeData.attestationType.toNumber() as AttestationType;
}

export function attReqToTransactionAttestationRequest(request: AttestationRequest): TransactionAttestationRequest {
  let attestationType = getAttestationTypeFromInstructions(request);
  let scheme = attestationTypeEncodingScheme(attestationType!);
  let data = decodeUint256(request.instructions, scheme.sizes, scheme.keys);
  return {
    ...request,
    ...data,
    attestationType: data.attestationType.toNumber() as AttestationType,
  } as TransactionAttestationRequest;
}

export function extractAttEvents(eventLogs: any[]) {
  let events: AttestationRequest[] = [];
  for (let log of eventLogs) {
    if (log.event != "AttestationRequest") {
      continue;
    }
    events.push({
      timestamp: log.args.timestamp,
      instructions: log.args.instructions,
      id: log.args.id,
      dataAvailabilityProof: log.args.dataAvailabilityProof,
    });
  }
  return events;
}

export function encodeToUint256(sizes: number[], keys: string[], valueObject: any) {
  if (sizes.length != keys.length) {
    throw new Error("Sizes do not match");
  }
  if (sizes.reduce((a, b) => a + b) != 256) {
    throw new Error("Sizes do not add up to 256");
  }
  let encoding = toBN(0);
  for (let i = 0; i < sizes.length; i++) {
    if (sizes[i] <= 0) {
      throw new Error("Too small size");
    }
    encoding = encoding.shln(sizes[i]);
    if (!keys[i]) {
      continue;
    }
    let val = valueObject[keys[i]];
    // If value for a key is not provided, its value is considered 0 as BN
    let value = toBN(0);
    if (val && val.constructor?.name === "BN") {
      if (val.shrn(sizes[i]).gt(toBN(0))) {
        throw new Error(`Value ${value} overflows size ${sizes[i]} on index ${i}.`);
      } else {
        value = val as BN;
      }
    } else if (val) {
      throw new Error("Wrong type of value");
    }
    encoding = encoding.add(value);
  }
  return encoding;
}

export function decodeUint256(encoding: BN, sizes: number[], keys: string[]) {
  if (sizes.length != keys.length) {
    throw new Error("Sizes do not match");
  }
  if (sizes.reduce((a, b) => a + b) != 256) {
    throw new Error("Sizes do not add up to 256");
  }
  let keysWithoutNull = keys.filter((x) => !!x);
  let keySet = new Set(keysWithoutNull);
  if (keysWithoutNull.length != keySet.size) {
    throw new Error("Duplicate non-null keys are not allowed");
  }
  let decoded: any = {};
  for (let i = sizes.length - 1; i >= 0; i--) {
    let mask = toBN(0).bincn(sizes[i]).sub(toBN(1));
    if (keys[i] != "") {
      decoded[keys[i]] = encoding.and(mask);
    }
    encoding = encoding.shrn(sizes[i]);
  }
  return decoded;
}

export function transactionHash(web3: Web3, txData: NormalizedTransactionData) {
  let scheme = attestationTypeEncodingScheme(txData.attestationType!);
  let values = scheme.hashKeys.map((key) => {
    let val = (txData as any)[key];
    switch (key) {
      case "sourceAddresses":
      case "destinationAddresses":
        return web3.utils.soliditySha3(val);
      default:
        return val;
    }
  });
  const encoded = web3.eth.abi.encodeParameters(scheme.hashTypes, values);
  return web3.utils.soliditySha3(encoded);
}

export function instructionsCheck(additionalData: AdditionalTransactionDetails, attRequest: TransactionAttestationRequest) {
  let scheme = attestationTypeEncodingScheme(attRequest.attestationType!);
  let decoded = decodeUint256(attRequest.instructions, scheme.sizes, scheme.keys);
  for (let i = 0; i < scheme.keys.length - 1; i++) {
    let key = scheme.keys[i];
    if (["attestationType", "chainId"].indexOf(key) >= 0) {
      continue;
    }
    if (!(decoded[key] as BN).eq((additionalData as any)[key] as BN)) {
      // console.log(decoded[key].toString());
      // console.log((additionalData as any)[key].toString());
      return false;
    }
  }
  return true;
}

export function checkDataAvailability(additionalData: AdditionalTransactionDetails, attRequest: TransactionAttestationRequest) {
  if (!attRequest.dataAvailabilityProof) {
    return VerificationStatus.DATA_AVAILABILITY_PROOF_REQUIRED;
  }
  // Proof is empty if availability check was not successful
  if (!additionalData.dataAvailabilityProof) {
    return VerificationStatus.NOT_CONFIRMED;
  }

  if (attRequest.dataAvailabilityProof.toLowerCase() !== additionalData.dataAvailabilityProof.toLowerCase()) {
    return VerificationStatus.WRONG_DATA_AVAILABILITY_PROOF;
  }

  if (additionalData.dataAvailabilityBlockOffset != numberOfConfirmations(toNumber(attRequest.chainId)!)) {
    console.log(additionalData.dataAvailabilityBlockOffset, numberOfConfirmations(toNumber(attRequest.chainId)!));
    return VerificationStatus.WRONG_DATA_AVAILABILITY_HEIGHT;
  }

  return VerificationStatus.OK;
}
