import { AttesterClientChain } from "./AttesterClientChain";

export class AttesterClientConfiguration {
  public accountPrivateKey!: string;
  public rpcUrl!: string;
  public wsUrl!: string;

  public stateConnectorContractAddress!: string;

  public gasPrice!: string;

  // start epoch in sec
  public firstEpochStartTime!: number;
  // epoch perior in sec
  public epochPeriod!: number;

  public dynamicAttestationConfigurationFolder: string = "./dac/";

  // in sec
  public commitTime!: number;
  // in sec
  public revealTime!: number;

  public epoch!: number;

  public chains: AttesterClientChain[] = [];
}
