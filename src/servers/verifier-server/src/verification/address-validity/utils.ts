import { createHash } from "crypto";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { ZERO_BYTES_32 } from "../../../../../external-libs/utils";
import { standardAddressHash } from "@flarenetwork/mcc";

export function base58Checksum(decodedAddress: Buffer): boolean {
  const preChecksum = decodedAddress.subarray(-4);
  const hash1 = createHash("sha256").update(decodedAddress.subarray(0, -4)).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  const newChecksum = hash2.subarray(0, 4);
  return preChecksum.equals(newChecksum);
}

export const INVALID_ADDRESS_RESPONSE: AddressValidity_ResponseBody = {
  isValid: false,
  standardAddress: "",
  standardAddressHash: ZERO_BYTES_32,
};

export function validAddressToResponse(address: string, lowercase: boolean): AddressValidity_ResponseBody {
  const standardAddress = lowercase ? address.toLowerCase() : address;
  return { isValid: true, standardAddress: standardAddress, standardAddressHash: standardAddressHash(standardAddress) };
}
