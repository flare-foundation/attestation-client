import Web3 from "web3";
import BN from "bn.js";
import { ARBase } from "../generated/attestation-request-types";

const toBN = Web3.utils.toBN;

export class AttestationRequestEncodeError extends Error {
  constructor(message: any) {
    super(message);
    this.name = "AttestationRequestEncodeError";
  }
}

export class AttestationRequestParseError extends Error {
  constructor(message: any) {
    super(message);
    this.name = "AttestationRequestParseError";
  }
}

export class AttestationRequestEqualsError extends Error {
  constructor(message: any) {
    super(message);
    this.name = "AttestationRequestEqualsError";
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
export function fromUnprefixedBytes(bytes: string, type: string, size: number) {
  switch (type) {
    case "AttestationType":
      return toBN(prefix0x(bytes)).toNumber();
    case "NumberLike":
      return toBN(prefix0x(bytes));
    case "SourceId":
      return toBN(prefix0x(bytes)).toNumber();
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
      attestationType: toBN(prefix0x(input.slice(0, 4))).toNumber(),
      sourceId: toBN(prefix0x(input.slice(4, 12))).toNumber(),
      messageIntegrityCode: prefix0x(input.slice(12, 76)),
    } as ARBase;
  } catch (e) {
    throw new AttestationRequestParseError(e);
  }
}
export function toUnprefixedBytes(value: any, type: string, size: number, key: string) {
  let bytes = "";
  switch (type) {
    case "AttestationType":
      bytes = unPrefix0x(toHex(value as number, size));
      break;
    case "NumberLike":
      const hexValue = toHex(value, size);
      if (hexValue.startsWith("-")) {
        throw new AttestationRequestEncodeError("Negative 'NumberLike' values are not supported in requests");
      }
      bytes = unPrefix0x(hexValue);
      break;
    case "SourceId":
      bytes = unPrefix0x(toHex(value as number, size));
      break;
    case "ByteSequenceLike":
      bytes = unPrefix0x(toHex(value, size));
      break;
    default:
      throw new AttestationRequestEncodeError("Wrong type");
  }
  if (bytes.length > size * 2) {
    throw new AttestationRequestEncodeError("Too long byte string for key: " + key);
  }
  return bytes;
}

export function assertEqualsByScheme(a: any, b: any, type: string) {
  switch (type) {
    case "AttestationType":
      return a === b;
    case "NumberLike":
      return toBN(a).eq(toBN(b));
    case "SourceId":
      return a === b;
    case "ByteSequenceLike":
      return a === b;
    default:
      throw new AttestationRequestEqualsError("Wrong type");
  }
}
