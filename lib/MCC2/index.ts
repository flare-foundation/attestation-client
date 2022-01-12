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

  export function create(chainIdOrName: number | string | ChainType, options: AlgoMccCreate | UtxoMccCreate | XrpMccCreate) {
    switch (chainIdOrName) {
      case "XRP":
      case "RIPPLE":
        return XRP;
      case "BTC":
      case ChainType.BTC:
        return new BTC(options as UtxoMccCreate);
      case "LTC":
        return LTC;
      default: {
        throw new Error("Not implemented");
      }
    }
  }
}
