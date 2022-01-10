import { AttesterClientChain } from "./AttesterClientChain";

export class AttesterClientConfiguration {
  public accountPrivateKey!: string;
  public rpcUrl!: string;
  public wsUrl!: string;

  public stateConnectorContractAddress!: string;

  public gasPrice!: string;

  public firstEpochStartTime!: number;
  public epochPeriod!: number;

  public commitTime!: number;
  public revealTime!: number;

  public epoch!: number;

  public chains: AttesterClientChain[] = [];

  async validate() {
    // todo: add validations
  }
}
