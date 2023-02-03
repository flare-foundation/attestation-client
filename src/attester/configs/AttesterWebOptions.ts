import { optional } from "@flarenetwork/mcc";

/**
 * Blockchain connection configuration class for an attestation client
 */

export class AttesterWebOptions {
  public accountPrivateKey = "";
  public rpcUrl = "";
  public stateConnectorContractAddress = "";
  @optional() public bitVotingContractAddress = "";
  @optional() public gasLimit = "2500000";
  @optional() public gasPrice = "300000000000";
  @optional() public refreshEventsMs = 100;
}
