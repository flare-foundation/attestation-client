import { ChainType } from "@flarenetwork/mcc";
import { verifyAddressBTC } from "./address-validity/address-validity-btc";
import { VerificationResponse } from "./verification-utils";

export function verifyAddress(chainType: ChainType, address: string, testnet = process.env.TEST_NETWORK): VerificationResponse<string> {
  switch (chainType) {
    case ChainType.BTC:
      return verifyAddressBTC(address, test);
    case ChainType.DOGE:
      return verifyAddressDOGE(address, test);
    case ChainType.XRP:
      return verifyAddressXRP(address, test);
  }
}
