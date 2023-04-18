//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import Web3 from "web3";
import BN from "bn.js";
import {
  ARPayment,
  ARBalanceDecreasingTransaction,
  ARConfirmedBlockHeightExists,
  ARReferencedPaymentNonexistence,
  ARType,
  ARBase,
} from "./attestation-request-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";

const toBN = Web3.utils.toBN;
const web3 = new Web3();
//////////////////////////////////////////////////////////////
// Functions for parsing attestation requests from byte strings
//////////////////////////////////////////////////////////////

export class AttestationRequestParseError extends Error {
  constructor(message: any) {
    super(message);
    this.name = "AttestationRequestParseError";
  }
}

export function unPrefix0x(tx: string) {
  if (!tx) {
    return "0x0";
  } else if (tx.startsWith("0x") || tx.startsWith("0X")) {
    return tx.slice(2);
  }
  return tx;
}

export function prefix0x(tx: string) {
  if (!tx) {
    return "0x0";
  } else if (tx.startsWith("0x") || tx.startsWith("0X")) {
    return tx;
  }
  return "0x" + tx;
}

export function toHex(x: string | number | BN, padToBytes?: number) {
  const hexValue = Web3.utils.toHex(x);
  if (hexValue.startsWith("-")) {
    throw new AttestationRequestParseError("Negative values are not supported in attestation requests");
  }
  if ((padToBytes as any) > 0) {
    return Web3.utils.leftPad(Web3.utils.toHex(x), padToBytes! * 2);
  }
  return hexValue;
}

function fromUnprefixedBytes(bytes: string, type: string, size: number) {
  switch (type) {
    case "AttestationType":
      return toBN(prefix0x(bytes)).toNumber() as AttestationType;
    case "NumberLike":
      return toBN(prefix0x(bytes));
    case "SourceId":
      return toBN(prefix0x(bytes)).toNumber() as SourceId;
    case "ByteSequenceLike":
      return toHex(prefix0x(bytes), size);
    default:
      throw new AttestationRequestParseError("Unsuported attestation request");
  }
}

export function getAttestationTypeAndSource(bytes: string) {
  try {
    const input = unPrefix0x(bytes);
    if (!bytes || bytes.length < 12) {
      throw new AttestationRequestParseError("Cannot read attestation type and source id");
    }
    return {
      attestationType: toBN(prefix0x(input.slice(0, 4))).toNumber() as AttestationType,
      sourceId: toBN(prefix0x(input.slice(4, 12))).toNumber() as SourceId,
      messageIntegrityCode: prefix0x(input.slice(12, 76)),
    } as ARBase;
  } catch (e) {
    throw new AttestationRequestParseError(e);
  }
}

/**
 * Parses an attestation request of type Payment from byte string @param bytes to object of type ARPayment
 */
export function parsePayment(bytes: string): ARPayment {
  if (!bytes) {
    throw new AttestationRequestParseError("Empty attestation request");
  }
  const input = unPrefix0x(bytes);
  if (input.length != 152) {
    throw new AttestationRequestParseError("Incorrectly formatted attestation request");
  }

  return {
    attestationType: fromUnprefixedBytes(input.slice(0, 4), "AttestationType", 2) as AttestationType,
    sourceId: fromUnprefixedBytes(input.slice(4, 12), "SourceId", 4) as SourceId,
    messageIntegrityCode: fromUnprefixedBytes(input.slice(12, 76), "ByteSequenceLike", 32) as string,
    id: fromUnprefixedBytes(input.slice(76, 140), "ByteSequenceLike", 32) as string,
    blockNumber: fromUnprefixedBytes(input.slice(140, 148), "NumberLike", 4) as BN,
    inUtxo: fromUnprefixedBytes(input.slice(148, 150), "NumberLike", 1) as BN,
    utxo: fromUnprefixedBytes(input.slice(150, 152), "NumberLike", 1) as BN,
  };
}

/**
 * Parses an attestation request of type BalanceDecreasingTransaction from byte string @param bytes to object of type ARBalanceDecreasingTransaction
 */
export function parseBalanceDecreasingTransaction(bytes: string): ARBalanceDecreasingTransaction {
  if (!bytes) {
    throw new AttestationRequestParseError("Empty attestation request");
  }
  const input = unPrefix0x(bytes);
  if (input.length != 212) {
    throw new AttestationRequestParseError("Incorrectly formatted attestation request");
  }

  return {
    attestationType: fromUnprefixedBytes(input.slice(0, 4), "AttestationType", 2) as AttestationType,
    sourceId: fromUnprefixedBytes(input.slice(4, 12), "SourceId", 4) as SourceId,
    messageIntegrityCode: fromUnprefixedBytes(input.slice(12, 76), "ByteSequenceLike", 32) as string,
    id: fromUnprefixedBytes(input.slice(76, 140), "ByteSequenceLike", 32) as string,
    blockNumber: fromUnprefixedBytes(input.slice(140, 148), "NumberLike", 4) as BN,
    sourceAddressIndicator: fromUnprefixedBytes(input.slice(148, 212), "ByteSequenceLike", 32) as string,
  };
}

/**
 * Parses an attestation request of type ConfirmedBlockHeightExists from byte string @param bytes to object of type ARConfirmedBlockHeightExists
 */
export function parseConfirmedBlockHeightExists(bytes: string): ARConfirmedBlockHeightExists {
  if (!bytes) {
    throw new AttestationRequestParseError("Empty attestation request");
  }
  const input = unPrefix0x(bytes);
  if (input.length != 92) {
    throw new AttestationRequestParseError("Incorrectly formatted attestation request");
  }

  return {
    attestationType: fromUnprefixedBytes(input.slice(0, 4), "AttestationType", 2) as AttestationType,
    sourceId: fromUnprefixedBytes(input.slice(4, 12), "SourceId", 4) as SourceId,
    messageIntegrityCode: fromUnprefixedBytes(input.slice(12, 76), "ByteSequenceLike", 32) as string,
    blockNumber: fromUnprefixedBytes(input.slice(76, 84), "NumberLike", 4) as BN,
    queryWindow: fromUnprefixedBytes(input.slice(84, 92), "NumberLike", 4) as BN,
  };
}

/**
 * Parses an attestation request of type ReferencedPaymentNonexistence from byte string @param bytes to object of type ARReferencedPaymentNonexistence
 */
export function parseReferencedPaymentNonexistence(bytes: string): ARReferencedPaymentNonexistence {
  if (!bytes) {
    throw new AttestationRequestParseError("Empty attestation request");
  }
  const input = unPrefix0x(bytes);
  if (input.length != 260) {
    throw new AttestationRequestParseError("Incorrectly formatted attestation request");
  }

  return {
    attestationType: fromUnprefixedBytes(input.slice(0, 4), "AttestationType", 2) as AttestationType,
    sourceId: fromUnprefixedBytes(input.slice(4, 12), "SourceId", 4) as SourceId,
    messageIntegrityCode: fromUnprefixedBytes(input.slice(12, 76), "ByteSequenceLike", 32) as string,
    minimalBlockNumber: fromUnprefixedBytes(input.slice(76, 84), "NumberLike", 4) as BN,
    deadlineBlockNumber: fromUnprefixedBytes(input.slice(84, 92), "NumberLike", 4) as BN,
    deadlineTimestamp: fromUnprefixedBytes(input.slice(92, 100), "NumberLike", 4) as BN,
    destinationAddressHash: fromUnprefixedBytes(input.slice(100, 164), "ByteSequenceLike", 32) as string,
    amount: fromUnprefixedBytes(input.slice(164, 196), "NumberLike", 16) as BN,
    paymentReference: fromUnprefixedBytes(input.slice(196, 260), "ByteSequenceLike", 32) as string,
  };
}

/**
 * Parses an attestation request from byte string @param bytes to object of type ARType
 */
export function parseRequest(bytes: string): ARType {
  const { attestationType } = getAttestationTypeAndSource(bytes);
  switch (attestationType) {
    case AttestationType.Payment:
      return parsePayment(bytes);
    case AttestationType.BalanceDecreasingTransaction:
      return parseBalanceDecreasingTransaction(bytes);
    case AttestationType.ConfirmedBlockHeightExists:
      return parseConfirmedBlockHeightExists(bytes);
    case AttestationType.ReferencedPaymentNonexistence:
      return parseReferencedPaymentNonexistence(bytes);
    default:
      throw new AttestationRequestParseError("Invalid attestation type");
  }
}
