/**
 * Block header data in the indexer database
 */
export class ApiDBBlock {
  /**
   * Block hash
   */
  blockHash: string;
  /**
   * Block number
   */
  blockNumber: number;
  /**
   * Block timestamp in seconds
   */
  timestamp: number;
  /**
   * Number of transactions in the block.
   */
  transactions?: number;

  /**
   * Whether the block is confirmed.
   */
  confirmed?: boolean;

  /**
   * Number of confirmations of the block.
   */
  numberOfConfirmations: number;

  /**
   * Parent block hash.
   */
  previousBlockHash: string;
}
