import { optional } from "@flarenetwork/mcc";

/**
 * Flare chain connection configuration class for an attestation client.
 */

export class AttesterWebOptions {
  /**
   * Private key for submissions to StateConnector and BitVoting contracts onto Flare chain
   */
  public accountPrivateKey = "";

  /**
   * RPC connection for Flare chain, that is used in web3.js library. Can be REST or websocket.
   */
  public rpcUrl = "";

  /**
   * StateConnector contract address on the Flare chain.
   */
  public stateConnectorContractAddress = "";

  /**
   * BitVoting contract address on the Flare chain.
   */
  @optional() public bitVotingContractAddress = "";

  /**
   * Gas limit for sending transactions. Defined as string.
   */
  @optional() public gasLimit = "2500000";

  /**
   * Gas price for sending transactions. Defined as string in Gwei.
   */
  @optional() public gasPrice = "300000000000";

  /**
   * Polling time for collection data from the Flare chain (new blocks, new events).
   */
  @optional() public refreshEventsMs = 100;
}
