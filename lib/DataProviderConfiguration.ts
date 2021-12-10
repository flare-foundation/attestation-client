import { DataProviderChain } from "./DataProviderChain";

export class DataProviderConfiguration {
  public accountPrivateKey!: string;
  public rpcUrl!: string;
  public wsUrl!: string;

  public gasPrice!: string;
  public whitelist!: boolean;
  public trusted!: boolean;

  public ftsoManagerContractAddress!: string;
  public priceSubmitterContractAddress!: string;

  public firstEpochStartTime!: number;
  public epochPeriod!: number;

  public commitTime!: number;
  public revealTime!: number;

  public epoch!: number;

  public chains: DataProviderChain[] = [];

  async validate() {
    if (!this.accountPrivateKey) {
      throw Error("Parameter 'accountPrivateKey' is missing, but is required");
    } else if (!this.rpcUrl) {
      throw Error("Parameter 'rpcUrl' is missing, but is required");
    } else if (!this.ftsoManagerContractAddress) {
      throw Error("Parameter 'ftsoManagerContractAddress' is missing, but is required");
    }
  }
}
