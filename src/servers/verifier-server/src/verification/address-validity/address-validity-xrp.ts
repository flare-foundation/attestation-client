import base from "base-x";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { VerificationResponse } from "../verification-utils";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { standardAddressHash } from "@flarenetwork/mcc";
import { base58Checksum } from "./utils";

const R_B58_DICT = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const base58 = base(R_B58_DICT);
const classicAddressRegex = /r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{24,34}/;
const invalidCharacters = /[^rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]/;

export function validCharacters(address: string): boolean {
  console.log(classicAddressRegex.test(address), !invalidCharacters.test(address));

  return classicAddressRegex.test(address) && !invalidCharacters.test(address);
}

/**
 * Verifies that @param address given as a string represents a valid address on XRPL.
 * If @param testnet is truthy, checks whether address is valid on testnet.
 * @returns
 */
export function verifyAddressXRP(address: string, testnet = process.env.TESTNET): VerificationResponse<AddressValidity_ResponseBody> {
  const char = validCharacters(address);
  console.log(0);
  if (!char) return { status: VerificationStatus.NOT_CONFIRMED };
  const decodedAddress = base58.decode(address);
  console.log(1);
  if (decodedAddress.length != 25) return { status: VerificationStatus.NOT_CONFIRMED };
  console.log(2);

  const checksum = base58Checksum(decodedAddress);

  if (!checksum) return { status: VerificationStatus.NOT_CONFIRMED };
  console.log(3);

  if (decodedAddress[0] != 0) return { status: VerificationStatus.NOT_CONFIRMED };

  console.log(4);

  const response = {
    standardAddress: address,
    standardAddressHash: standardAddressHash(address),
  };
  return { status: VerificationStatus.OK, response };
}
