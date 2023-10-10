import base from "base-x";
import { createHash } from "crypto";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { VerificationResponse } from "../verification-utils";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { standardAddressHash } from "@flarenetwork/mcc";
import { add } from "winston";
import { base58Checksum } from "./utils";

const R_B58_DICT = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const base58 = base(R_B58_DICT);
const classicAddressRegex = /r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}/;
const invalidCharacters = /[^rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]/;

function validCharacters(address: string): boolean {
  return classicAddressRegex.test(address) && !invalidCharacters.test(address);
}

/**
 * Verifies that @param address given as a string represents a valid address on XRPL.
 * If @param testnet is truthy, checks whether address is valid on testnet.
 * @returns
 */
export function verifyAddressXRP(address: string, testnet = process.env.TESTNET): VerificationResponse<AddressValidity_ResponseBody> {
  const char = validCharacters(address);

  if (!char) return { status: VerificationStatus.NOT_CONFIRMED };
  const decodedAddress = base58.decode(address);

  if (decodedAddress.length != 25) return { status: VerificationStatus.NOT_CONFIRMED };

  const checksum = base58Checksum(decodedAddress);

  if (!checksum) return { status: VerificationStatus.NOT_CONFIRMED };

  if (decodedAddress[0] != 0) return { status: VerificationStatus.NOT_CONFIRMED };

  const response = {
    standardAddress: address,
    standardAddressHash: standardAddressHash(address),
  };
  return { status: VerificationStatus.OK, response };
}
