import BN from "bn.js";
import Web3 from "web3";
import { TransactionMetadata, TxResponse } from "xrpl/dist/npm/models";
import { AttestationType } from "../attester/AttestationData";
import { AdditionalTransactionDetails, ChainType, IUtxoGetTransactionRes, RPCInterface } from "../MCC/types";
import { toBN, toNumber, unPrefix0x } from "../utils/utils";
////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////

export enum VerificationStatus {
  OK = "OK",
  NOT_CONFIRMED = "NOT_CONFIRMED",
  NOT_SINGLE_SOURCE_ADDRESS = "NOT_SINGLE_SOURCE_ADDRESS",
  NOT_SINGLE_DESTINATION_ADDRESS = "NOT_SINGLE_DESTINATION_ADDRESS",
  UNSUPPORTED_SOURCE_ADDRESS = "UNSUPPORTED_SOURCE_ADDRESS",
  WRONG_IN_UTXO = "WRONG_IN_UTXO",
  MISSING_IN_UTXO = "MISSING_IN_UTXO",
  EMPTY_IN_ADDRESS = "EMPTY_IN_ADDRESS",
  // MISSING_SOURCE_ADDRESS_HASH = "MISSING_SOURCE_ADDRESS_HASH",
  // SOURCE_ADDRESS_DOES_NOT_MATCH = "SOURCE_ADDRESS_DOES_NOT_MATCH",
  INSTRUCTIONS_DO_NOT_MATCH = "INSTRUCTIONS_DO_NOT_MATCH",
  WRONG_DATA_AVAILABILITY_PROOF = "WRONG_DATA_AVAILABILITY_PROOF",
  DATA_AVAILABILITY_PROOF_REQUIRED = "DATA_AVAILABILITY_PROOF_REQUIRED",
  FORBIDDEN_MULTISIG_SOURCE = "FORBIDDEN_MULTISIG_SOURCE",
  FORBIDDEN_MULTISIG_DESTINATION = "FORBIDDEN_MULTISIG_DESTINATION",
  FORBIDDEN_SELF_SENDING = "FORBIDDEN_SELF_SENDING",
  FUNDS_UNCHANGED = "FUNDS_UNCHANGED",
  FUNDS_INCREASED = "FUNDS_INCREASED",
  // COINBASE_TRANSACTION = "COINBASE_TRANSACTION",
  UNSUPPORTED_TX_TYPE = "UNSUPPORTED_TX_TYPE",
  RECHECK_LATER = "RECHECK_LATER",
}

export interface NormalizedTransactionData extends AdditionalTransactionDetails {
  attestationType: AttestationType;
  chainId: BN;
  verified: boolean;
  verificationStatus: VerificationStatus;
  utxo?: BN;
}

// export interface TransactionData extends NormalizedTransactionData{
//     type: AttestationType,
// };

export interface AttestationRequest {
  timestamp?: BN;
  instructions: BN;
  id: string;
  dataAvailabilityProof: string;
  attestationType?: AttestationType;
}

export interface TransactionAttestationRequest extends AttestationRequest {
  chainId: BN | number;
  blockNumber: BN | number;
  utxo?: BN | number;
}

export interface VerifiedAttestation {
  chainType: ChainType;
  attestType: AttestationType;
  txResponse?: any;
  blockResponse?: any;
  sender?: string;
  utxo?: number;
  fee?: BN;
  spent?: BN;
  delivered?: BN;
}

export interface AttestationTypeEncoding {
  sizes: number[];
  keys: string[];
  hashTypes: string[];
  hashKeys: string[];
}

////////////////////////////////////////////////////////////////////////
// Auxiliary
////////////////////////////////////////////////////////////////////////

export function prettyPrint(normalized: any) {
  let res: any = {};
  for (let key in normalized) {
    let obj = (normalized as any)[key];
    if (typeof obj === "object") {
      res[key] = (normalized as any)[key]?.toString();
    } else {
      res[key] = (normalized as any)[key];
    }
  }
  console.log(JSON.stringify(res, null, 2));
}

////////////////////////////////////////////////////////////////////////
// Filters for "nice" (supported) transaction types
////////////////////////////////////////////////////////////////////////

export function isSupportedTransactionForAttestationType(transaction: any, chainType: ChainType, attType: AttestationType) {
  switch (chainType) {
    case ChainType.BTC:
    case ChainType.LTC:
    case ChainType.DOGE:
      return isSupportedTransactionUtxo(transaction, attType);
    case ChainType.XRP:
      return isSupportedTransactionXRP(transaction, attType);
    default:
      throw new Error("Wrong chain id!");
  }
}

function isSupportedTransactionUtxo(transaction: any, attType: AttestationType): boolean {
  return true;
}

function isSupportedTransactionXRP(transaction: any, attType: AttestationType): boolean {
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

////////////////////////////////////////////////////////////////////////
// Attestation request manipulation and codings
////////////////////////////////////////////////////////////////////////

// export const TX_ATT_REQ_SIZES = [16, 32, 64, 16, 128];
// export const TX_ATT_REQ_KEYS = ["attestationType", "chainId", "blockNumber", "utxo", ""];

export const ATT_BITS = 32;
export const CHAIN_ID_BITS = 32;
export const UTXO_BITS = 8;

export function attestationTypeEncodingScheme(type: AttestationType) {
  switch (type) {
    case AttestationType.FassetPaymentProof:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, UTXO_BITS, 256 - ATT_BITS - CHAIN_ID_BITS - UTXO_BITS],
        keys: ["attestationType", "chainId", "utxo", ""],
        hashTypes: [
          "uint32", // type
          "uint64", // chainId
          "uint64", // blockNumber
          "bytes32", // txId
          "uint8", // utxo
          "bytes32", // sourceAddress
          "bytes32", // destinationAddress
          "uint256", // destinationTag
          "uint256", // spent
          "uint256", // delivered
          "uint256", // fee
          "uint8", // status
        ],
        hashKeys: [
          "attestationType",
          "chainId",
          "blockNumber",
          "txId",
          "utxo",
          "sourceAddresses",
          "destinationAddresses",
          "destinationTag",
          "spent",
          "delivered",
          "fee",
          "status",
        ],
      };
    case AttestationType.BalanceDecreasingProof:
      return {
        sizes: [ATT_BITS, CHAIN_ID_BITS, UTXO_BITS, 256 - ATT_BITS - CHAIN_ID_BITS - UTXO_BITS],
        keys: ["attestationType", "chainId", "utxo", ""],
        hashTypes: [
          "uint32", // type
          "uint64", // chainId
          "uint64", // blockNumber
          "bytes32", // txId
          "bytes32", // sourceAddress
          "uint256", // spent
        ],
        hashKeys: ["attestationType", "chainId", "blockNumber", "txId", "sourceAddresses", "spent"],
      };

    default:
      throw new Error("Not yet implemented!");
  }
}

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

////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////

// Generic
// Add here specific calls for verification
export async function verifyTransactionAttestation(client: any, request: TransactionAttestationRequest, testFailProbability = 0) {
  if (!client) {
    throw new Error("Missing client!");
  }
  // if (!(request.attestationType === AttestationType.Transaction || request.attestationType === AttestationType.FassetPaymentProof)) {
  //     throw new Error("Wrong attestation Type")
  // }
  let chainId = toNumber(request.chainId) as ChainType;
  switch (chainId) {
    case ChainType.BTC:
    case ChainType.LTC:
    case ChainType.DOGE:
      return verififyAttestationUtxo(client, request, testFailProbability);
    case ChainType.XRP:
      return verififyAttestationXRP(client, request, testFailProbability);
    default:
      throw new Error("Wrong chain id!");
  }
}

export function numberOfConfirmations(chainType: ChainType) {
  let chainId = toNumber(chainType) as ChainType;
  switch (chainId) {
    case ChainType.BTC:
    case ChainType.LTC:
    case ChainType.DOGE:
      return 6;
    case ChainType.XRP:
      return 1;
    default:
      throw new Error("Wrong chain id!");
  }
}

// Post check for matching instructions
// At the moment, blockNumber is double checked here.
function instructionsCheck(additionalData: AdditionalTransactionDetails, attRequest: TransactionAttestationRequest) {
  let scheme = attestationTypeEncodingScheme(attRequest.attestationType!);
  let decoded = decodeUint256(attRequest.instructions, scheme.sizes, scheme.keys);
  for (let i = 0; i < scheme.keys.length - 1; i++) {
    let key = scheme.keys[i];
    if (["attestationType", "chainId"].indexOf(key) >= 0) {
      continue;
    }
    if (!(decoded[key] as BN).eq((additionalData as any)[key] as BN)) {
      console.log(decoded[key].toString());
      console.log((additionalData as any)[key].toString());
      return false;
    }
  }
  return true;
}

function checkDataAvailability(additionalData: AdditionalTransactionDetails, attRequest: TransactionAttestationRequest) {
  if (!attRequest.dataAvailabilityProof) {
    return VerificationStatus.DATA_AVAILABILITY_PROOF_REQUIRED;
  }
  // Proof is empty if availability check was not successful
  if (!additionalData.dataAvailabilityProof) {
    return VerificationStatus.NOT_CONFIRMED;
  }

  if (attRequest.dataAvailabilityProof.toLocaleLowerCase() !== additionalData.dataAvailabilityProof.toLocaleLowerCase()) {
    return VerificationStatus.WRONG_DATA_AVAILABILITY_PROOF;
  }
  return VerificationStatus.OK;
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

function checkAndAggregateToOnePaymentUtxo(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testFailProbability = 0
): NormalizedTransactionData {
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

  // check against instructions
  // if (!instructionsCheck(additionalData, attRequest)) {
  //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
  // }

  // Extract source address
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

  let theSource = sourceCandidates[0];
  if (theSource === "") {
    // console.log(additionalData.sourceAddresses[inUtxo])
    return genericReturnWithStatus(VerificationStatus.EMPTY_IN_ADDRESS);
  }
  let inFunds = toBN(0);
  // Calculate in funds
  for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
    let sources = additionalData.sourceAddresses[i];
    // TODO: Handle multisig addresses
    if (sources.length != 1) {
      continue;
    }
    let aSource = sources[0];
    if (aSource === theSource) {
      inFunds = inFunds.add((additionalData.spent as BN[])[i]);
    }
  }

  // Calculate total input funds
  let totalInFunds = toBN(0);
  (additionalData.spent as BN[]).forEach((value) => {
    totalInFunds = totalInFunds.add(value);
  });

  let destinations = new Set<string>();
  for (let destination of additionalData.destinationAddresses) {
    if (!destination || destination.length === 0) {
      // TODO: verify if no-address destinations (like type nulldata) can take funds.
      continue;
    }
    if (destination.length > 1) {
      return genericReturnWithStatus(VerificationStatus.FORBIDDEN_MULTISIG_DESTINATION);
    }
    let address = destination[0];
    if (address != theSource) {
      destinations.add(address);
    }
  }
  if (destinations.size === 0) {
    return genericReturnWithStatus(VerificationStatus.FORBIDDEN_SELF_SENDING);
  }
  if (destinations.size > 1) {
    return genericReturnWithStatus(VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS);
  }

  let theDestination = [...destinations][0];
  let totalOutFunds = toBN(0);
  let returnedFunds = toBN(0);

  for (let i = 0; i < (additionalData.delivered as BN[]).length; i++) {
    let destinations = (additionalData.destinationAddresses as string[][])[i];
    if (!destinations || destinations.length === 0) {
      // TODO: check if founds for empty transaction are 0
      continue;
    }
    let destAddress = destinations[0];
    let destDelivered = (additionalData.delivered as BN[])[i];
    if (destAddress === theSource) {
      returnedFunds = returnedFunds.add(destDelivered);
    }
    totalOutFunds = totalOutFunds.add(destDelivered);
  }

  let newAdditionalData = {
    ...additionalData,
    sourceAddresses: theSource,
    destinationAddresses: theDestination,
    spent: inFunds.sub(returnedFunds),
    delivered: totalOutFunds.sub(returnedFunds),
    fee: totalInFunds.sub(totalOutFunds),
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

  // Check that net spent amount must be > 0
  if (returnedFunds.eq(inFunds)) {
    return genericReturnWithStatus(VerificationStatus.FUNDS_UNCHANGED);
  }
  if (returnedFunds.gt(inFunds)) {
    return genericReturnWithStatus(VerificationStatus.FUNDS_INCREASED);
  }

  // check confirmations
  let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
  if (dataAvailabilityVerification != VerificationStatus.OK) {
    return newGenericReturnWithStatus(dataAvailabilityVerification);
  }

  return newGenericReturnWithStatus(VerificationStatus.OK);
}

function checkAndAggregateDecreaseBalancePaymentUtxo(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testFailProbability = 0
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

function checkAndAggregateUtxo(
  additionalData: AdditionalTransactionDetails,
  attRequest: TransactionAttestationRequest,
  testFailProbability = 0
): NormalizedTransactionData {
  switch (attRequest.attestationType) {
    case AttestationType.FassetPaymentProof:
      return checkAndAggregateToOnePaymentUtxo(additionalData, attRequest, testFailProbability);
    case AttestationType.BalanceDecreasingProof:
      return checkAndAggregateDecreaseBalancePaymentUtxo(additionalData, attRequest, testFailProbability);
    default:
      throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
  }
}

async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest, testFailProbability = 0) {
  try {
    let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id), { verbose: true })) as IUtxoGetTransactionRes;
    let additionalData = await client.getAdditionalTransactionDetails({
      transaction: txResponse,
      confirmations: numberOfConfirmations(toNumber(attRequest.chainId) as ChainType),
      dataAvailabilityProof: attRequest.dataAvailabilityProof,
    });
    return checkAndAggregateUtxo(additionalData, attRequest, testFailProbability);
  } catch (error) {
    // TODO: handle error
    console.log(error);
    return {} as any;
  }
}

async function verififyAttestationXRP(client: RPCInterface, attRequest: TransactionAttestationRequest, testFailProbability = 0) {
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
