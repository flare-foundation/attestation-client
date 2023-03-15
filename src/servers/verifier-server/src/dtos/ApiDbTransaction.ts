
/**
 * Confirmed transaction entry in the indexer database.
 */
export class ApiDBTransaction {
  /**
   * Entry id in the database.
   */
  id: number;
  /**
   * Chain type as number.
   */
  chainType: number;

  /**
   * Transaction id
   */
  transactionId: string;

  /**
   * Block number of the transaction
   */
  blockNumber: number = 0;

  /**
   * Block timestamp of the transaction.
   */
  timestamp: number;

  /**
   * Payment reference of the transaction.
   */
  paymentReference: string;

  /**
   * Validator node API response for transaction description. For UTXO chains additional information may be embedded into response.
   */
  response: string = "";

  /**
   * True if it is native payment.
   */
  isNativePayment: boolean;

  /**
   * Transaction type (depends on chain)
   */
  transactionType: string;
}

