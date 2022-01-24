import { ChainType } from "../MCC/types";
import { toNumber } from "../MCC/utils";

export function numberOfConfirmations(chainType: ChainType) {
  let chainId = toNumber(chainType) as ChainType;
  switch (chainId) {
    case ChainType.BTC:
    case ChainType.LTC:
    case ChainType.DOGE:
      return 6;
    case ChainType.XRP:
      return 1;
    default:
      throw new Error("Wrong chain id!");
  }
}
