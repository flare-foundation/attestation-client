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
   * Gas price is calculated from the network. The addition (in wei) is added to make the call more competitive.
   * Default is set to 20 Gwei.
   */
  @optional() public gasPriceAddition = "20000000000";

  /**
   * Polling time for collection data from the Flare chain (new blocks, new events).
   */
  @optional() public refreshEventsMs = 100;
}
