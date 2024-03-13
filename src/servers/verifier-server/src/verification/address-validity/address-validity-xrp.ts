import base from "base-x";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { VerificationResponse } from "../verification-utils";
import { INVALID_ADDRESS_RESPONSE, base58Checksum, validAddressToResponse } from "./utils";

const R_B58_DICT = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const base58 = base(R_B58_DICT);
const classicAddressRegex = /r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{24,34}/;
const invalidCharacters = /[^rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]/;

function validCharacters(address: string): boolean {
  return classicAddressRegex.test(address) && !invalidCharacters.test(address);
}

/**
 * Verifies that @param address given as a string represents a valid address on XRPL.
 * If @param testnet is truthy, checks whether address is valid on testnet.
 * @returns
 */
export function verifyAddressXRP(address: string, testnet = (process.env.TESTNET == "true")): VerificationResponse<AddressValidity_ResponseBody> {
  const char = validCharacters(address);
  if (!char) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };

  const decodedAddress = base58.decode(address);
  if (decodedAddress.length != 25) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };

  const checksum = base58Checksum(decodedAddress);

  if (!checksum) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };

  if (decodedAddress[0] != 0) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };

  const response = validAddressToResponse(address, false);
  return { status: VerificationStatus.OK, response };
}
