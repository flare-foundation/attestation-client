import { createHash } from "crypto";
import base from "base-x";
import { VerificationResponse } from "../verification-utils";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { standardAddressHash } from "@flarenetwork/mcc";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { add } from "winston";
import { base58Checksum } from "./utils";

const DOGE_BASE_58_DICT = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DOGE_BASE_58_DICT_regex = /[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/;

const dogeBase58 = base(DOGE_BASE_58_DICT);

export function verifyAddressDOGE(address: string, testnet = process.env.TESTNET): VerificationResponse<AddressValidity_ResponseBody> {
  let validPrefix: string[];
  let validPrefixDecodedDec: number[];

  if (testnet) {
    validPrefix = ["n", "m", "2"];
  } else {
    validPrefix = ["D", "A", "9"];
    validPrefixDecodedDec = [30, 22];
  }

  const shortLen = 25 > address.length || address.length > 34;
  if (shortLen) return { status: VerificationStatus.NOT_CONFIRMED };

  const invalidChar = DOGE_BASE_58_DICT_regex.test(address);
  if (invalidChar) return { status: VerificationStatus.NOT_CONFIRMED };

  const prefix = validPrefix.includes(address[0]);
  if (!prefix) return { status: VerificationStatus.NOT_CONFIRMED };

  const decodedAddress = dogeBase58.decode(address);
  if (decodedAddress.length != 25) return { status: VerificationStatus.NOT_CONFIRMED };
  const checksum = base58Checksum(decodedAddress);
  if (!checksum) return { status: VerificationStatus.NOT_CONFIRMED };

  if (!validPrefixDecodedDec.includes(decodedAddress[0])) return { status: VerificationStatus.NOT_CONFIRMED };
  else {
    const response = {
      standardAddress: address,
      standardAddressHash: standardAddressHash(address),
    };
    return { status: VerificationStatus.OK, response };
  }
}
