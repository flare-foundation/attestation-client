import base from "base-x";
import { createHash } from "crypto";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { VerificationResponse } from "../verification-utils";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { standardAddressHash } from "@flarenetwork/mcc";

const R_B58_DICT = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz";
const base58 = base(R_B58_DICT);
const classicAddressRegex = /r[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]{27,35}/;

function XRPisChecksumValid(address): boolean {
  const dec = base58.decode(this.privateData);
  const c1 = createHash("sha256").update(dec.subarray(0, -4)).digest();
  const c2 = createHash("sha256").update(c1).digest();
  const checksum_computed = c2.subarray(0, 4);
  const checksum_read = dec.subarray(-4);
  return checksum_computed.equals(checksum_read);
}

function validCharacters(address: string): boolean {
  return classicAddressRegex.test(address);
}

export function verifyAddressXRP(address: string, testnet = process.env.TESTNET): VerificationResponse<AddressValidity_ResponseBody> {
  const char = validCharacters(address);
  const len = base58.decode(address).length == 25;
  const checksum = XRPisChecksumValid(address);

  if (char && len && checksum) {
    const response = {
      standardAddress: address,
      standardAddressHash: standardAddressHash(address),
    };
    return { status: VerificationStatus.OK, response };
  } else return { status: VerificationStatus.NOT_CONFIRMED };
}
