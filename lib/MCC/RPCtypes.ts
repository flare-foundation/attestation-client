export interface vin_utxo {
  txid: string;
  vout: number;
  sequence?: number;
}

export interface vout_utxo {
  address?: string;
  amount?: number;
}

export enum TransactionStatus {
  SUCCESS,
  SENDER_FAILURE,
  RECEIVER_FAILURE
}

export interface AdditionalTransactionDetails {
  blockNumber: BN;
  blockHash: string;
  txId: string;
  sourceAddresses: string | string[][]; //
  inUtxo: BN;
  destinationAddresses: string | string[][];
  destinationTag?: BN;
  spent: BN | BN[];
  delivered: BN | BN[];
  fee: BN;
  dataAvailabilityProof: string;
  status: TransactionStatus;
}

export interface AdditionalTxRequest {
  transaction: any;
  dataAvailabilityProof: any;
  confirmations: number;
}

export interface AggregateTxRequest extends AdditionalTxRequest {
  sourceAddressHash?: string;
  destinationUtxo?: BN | number;
  aggregateUtxoAddressDelivered?: boolean;
}

export interface RPCInterface {
  /**
   *
   */
  getTransaction(txId: string, options?: GetTransactionOptions): any;

  /**
   * Get block height from underlying chain
   */
  getBlockHeight(): Promise<number>;

  /**
   * Create address on underlying chain
   * @param createAddressData object with meta data required to create address
   */
  createAddress(createAddressData: any): any;

  /**
   *
   * @param walletLabel
   * @param vin
   * @param out
   */
  createRawTransaction(walletLabel: string, vin: vin_utxo[], out: vout_utxo[]): any;

  /**
   *
   * @param rawTx Transaction to sign
   * @param walletLabel
   * @param keysList
   */
  signRawTransaction(walletLabel: string, rawTx: string, keysList: string[]): any;

  /**
   * Send raw transaction basic implementation
   * @param walletLabel
   * @param signedRawTx
   */
  sendRawTransaction(walletLabel: string, signedRawTx: string): any;

  /**
   * RAW TX
   * @param walletLabel
   * @param signedRawTx
   */
  sendRawTransactionInBlock(walletLabel: string, signedRawTx: string): any;

  fundAddress(address: string, amount: number): any;

  getBlock(blockNumberOrHash: number | string): any;

  getAdditionalTransactionDetails(request: AdditionalTxRequest): Promise<AdditionalTransactionDetails>;

  getTransactionHashesFromBlock(block: any): string[];

  getBlockHash(block: any): string;
}

export interface DogeRpcInterface extends RPCInterface {}

export interface UtxoRpcInterface extends RPCInterface {
  /**
   * Default block header
   * @param blockHash
   */
  getBlockHeader(blockHash: string): any;

  /**
   * Block data
   * @param blockHash
   */
  getBlockHeader(blockHashOrNumber: string | number): any;

  /**
   * Create wallet on rpc client
   * @param walletLabel
   */
  createWallet(walletLabel: string): any;

  /**
   * List all wallets you have access to on rpc client
   */
  listAllWallets(): any;

  /**
   *
   * @param walletLabel
   * @param addressLabel
   */
  listAllAddressesByLabel(walletLabel: string, addressLabel: string): any;

  /**
   * List all unspent transaction between blocks min - max
   * @param walletLabel wallet label
   * @param min minimal block number
   * @param max maximal block number
   */
  listUnspentTransactions(walletLabel: string, min: number, max: number): any;

  /**
   * Get private keys from addresses used to sign transactions
   * @param walletLabel Wallet label
   * @param address Address
   */
  getPrivateKey(walletLabel: string, address: string): any;
}

/**
 * Object to use in get transaction additional parameters
 */
export interface GetTransactionOptions {
  verbose?: boolean;
  binary?: boolean;
  min_block?: number;
  max_block?: number;
}

// XRP specigic data
export interface XrpCreateAddressData {}

interface XrpTransactionAmount {
  currency: string;
  issuer: string;
  value: string;
}

export interface XrpGetTransactionResponse {
  Account: string;
  Amount: XrpTransactionAmount;
  Destination: string;
  Fee: string;
  Flags: number;
  Sequence: number;
  SigningPubKey: string;
  TransactionType: string;
  TxnSignature: string;
  date: number;
  hash: string;
  inLedger: number;
  ledger_index: number;
  meta: any[];
  status: string;
  validated: boolean;
  warnings: any[];
}
