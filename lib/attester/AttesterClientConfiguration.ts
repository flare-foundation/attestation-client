import { DatabaseConnectOptions } from "../utils/databaseService";
import { AttesterClientChain } from "./AttesterClientChain";

export class AttesterClientConfiguration {
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

export class AttesterWebOptions {
  public accountPrivateKey!: string;
  public rpcUrl!: string;
  public stateConnectorContractAddress!: string;
  
}

export class AttesterCredentials {
  public web: AttesterWebOptions;
  public attesterDatabase : DatabaseConnectOptions;
  public indexerDatabase : DatabaseConnectOptions;

}

