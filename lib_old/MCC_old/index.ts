import { AlgoMccCreate, ChainType, RPCInterface, UtxoMccCreate, XrpMccCreate } from "./types";
import { BTCImplementation } from "./chain_clients/BtcRpcImplementation";
import { DOGEImplementation } from "./chain_clients/DogeRpcImplementation";
import { LTCImplementation } from "./chain_clients/LtcRpcImplementation";
import { XRPImplementation } from "./chain_clients/XrpRpcImplementation";
import { ALGOImplementation } from "./chain_clients/AlgoRpcImplementation";

export module MCC {
  export class LTC extends LTCImplementation implements RPCInterface {
    constructor(options: UtxoMccCreate) {
      super(options);
    }
  }

  export class BTC extends BTCImplementation implements RPCInterface {
    constructor(options: UtxoMccCreate) {
      super(options);
    }
  }

  export class DOGE extends DOGEImplementation implements RPCInterface {
    constructor(options: UtxoMccCreate) {
      super(options);
    }
  }

  export class XRP extends XRPImplementation implements RPCInterface {
    constructor(options: XrpMccCreate) {
      super(options.url, options.username || "", options.password || "", options.inRegTest || false);
    }
  }

  export class ALGO extends ALGOImplementation {
    constructor(createConfig: AlgoMccCreate) {
      super(createConfig);
    }
  }

  export function getChainType(chainIdOrName: number | string | ChainType) {
    if (chainIdOrName == null) {
      throw new Error("Chain missing");
    }
    switch (chainIdOrName) {
      case "XRP":
      case "RIPPLE":
      case ChainType.XRP:
        return ChainType.XRP;
      case "BTC":
      case ChainType.BTC:
        return ChainType.BTC;
      case "LTC":
      case ChainType.LTC:
        return ChainType.LTC;
      case "DOGE":
      case ChainType.DOGE:
        return ChainType.DOGE;
      case "ALGO":
      case "ALGORAND":
      case ChainType.ALGO:
        return ChainType.ALGO;
      default:
        return ChainType.invalid;
    }
  }

  export function getChainTypeName(chainIdOrName: ChainType) {
    if (chainIdOrName == null) {
      throw new Error("Chain missing")
    }
    switch (chainIdOrName) {
      case ChainType.XRP:
        return "XRP";
      case ChainType.BTC:
        return "BTC";
      case ChainType.LTC:
        return "LTC";
      case ChainType.DOGE:
        return "DOGE";
      case ChainType.ALGO:
        return "ALGO"
      default:
        return "invalid"
    }
  }

  export function Client(chainIdOrName: number | string | ChainType, options: AlgoMccCreate | UtxoMccCreate | XrpMccCreate) {
    const chainType = getChainType(chainIdOrName);
    switch (chainType) {
      case ChainType.XRP:
        return new XRP(options as XrpMccCreate);
      case ChainType.BTC:
        return new BTC(options as UtxoMccCreate);
      case ChainType.LTC:
        return new LTC(options as UtxoMccCreate);
      case ChainType.DOGE:
        return new DOGE(options as UtxoMccCreate);
      case ChainType.ALGO:
        return new ALGO(options as AlgoMccCreate);
      default: {
        throw new Error("Not implemented");
      }
    }
  }
}
