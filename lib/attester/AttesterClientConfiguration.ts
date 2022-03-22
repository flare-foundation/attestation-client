import { AttesterClientChain } from "./AttesterClientChain";

export class AttesterClientConfiguration {
  public accountPrivateKey!: string;
  public rpcUrl!: string;

  public stateConnectorContractAddress!: string;

  public gasPrice!: string;

  // start epoch in sec
  public firstEpochStartTime!: number;

  // voting round duration in sec
  public roundDurationSec!: number;

  public dynamicAttestationConfigurationFolder: string = "./dac/";

  // in sec
  public commitTime!: number;
  // in sec
  public revealTime!: number;

  public chains: AttesterClientChain[] = [];


  public simulation: boolean = false; 
}

