export enum ChainType {
  invalid = -1,
  BTC = 1,
  XRP = 2,
  // ... make sure IDs are the same as in Flare node
}

export class MCCNodeSettings {
  chainType: ChainType;
  url: string;
  username: string;
  password: string;
  metaData: any;

  constructor(chainType: ChainType, url: string, username: string, password: string, metaData: any) {
    this.chainType = chainType;
    this.url = url;
    this.username = username;
    this.password = password;
    this.metaData = metaData;
  }

  static getChainType(type: string): ChainType {
    const typeUpper = type.toUpperCase();
    if (typeUpper === "XRP") return ChainType.XRP;
    if (typeUpper === "BTC") return ChainType.BTC

    return ChainType.invalid;
  }
}
