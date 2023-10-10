import { createHash } from "crypto";
import base from "base-x";
import { VerificationResponse } from "../verification-utils";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { add } from "winston";

enum DOGEAddressTypes {
  P2PKH = "P2PKH",
  P2SH = "P2SH",
  INVALID = "INVALID",
}

enum DOGETestAddressTypes {
  TEST_P2PKH = "TEST_P2PKH",
  TEST_P2SH = "TEST_P2SH",
  INVALID = "INVALID",
}

const DOGE_BASE_58_DICT = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DOGE_BASE_58_DICT_regex = /[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/;

const dogeBase58 = base(DOGE_BASE_58_DICT);

function dogeBase58Decode(address: string): Buffer {
  return dogeBase58.decode(address);
}

function dogeBase58Checksum(address: string): boolean {
  let decoded = dogeBase58Decode(address);
  const preChecksum = decoded.subarray(-4);
  const hash1 = createHash("sha256").update(decoded.subarray(0, -4)).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  const newChecksum = hash2.subarray(0, 4);
  return preChecksum.equals(newChecksum);
}

export function verifyAddressDOGE(address: string, testnet): VerificationResponse<string> {
  let validPrefix: string[];
  if (testnet) {
    validPrefix = ["n", "m", "2"];
  } else {
    validPrefix = ["D", "A", "9"];
  }

  const len = 25 > address.length || address.length > 34;
  const char = DOGE_BASE_58_DICT_regex.test(address);
  const checksum = dogeBase58Checksum(address);
  const prefix = validPrefix.includes(address[0]);
  if (len && char && checksum && prefix) return { status: VerificationStatus.OK, response: address };
  else return { status: VerificationStatus.NOT_CONFIRMED };
}
