import { ChainType, standardAddressHash } from "@flarenetwork/mcc";
import { verifyAddressBTC } from "./address-validity/address-validity-btc";
import { VerificationResponse } from "./verification-utils";
import { verifyAddressDOGE } from "./address-validity/address-validity-doge";
import { AddressValidity_ResponseBody } from "../dtos/attestation-types/AddressValidity.dto";
import { VerificationStatus } from "../../../../verification/attestation-types/attestation-types";

export function verifyAddress(chainType: ChainType, address: string, testnet = process.env.TEST_NETWORK): VerificationResponse<AddressValidity_ResponseBody> {
  let res: VerificationResponse<string>;

  switch (chainType) {
    case ChainType.BTC:
      res = verifyAddressBTC(address, test);
    case ChainType.DOGE:
      res = verifyAddressDOGE(address, test);
    case ChainType.XRP:
      res = verifyAddressBTC(address, test);
  }

  if (!res || res.status != VerificationStatus.OK || !res.response) return { status: VerificationStatus.NOT_CONFIRMED };

  const stdAddressHash = standardAddressHash(res.response);

  const responseBody: AddressValidity_ResponseBody = {
    standardAddress: res.response,
    standardAddressHash: stdAddressHash,
  };

  return { status: VerificationStatus.OK, response: responseBody };
}
