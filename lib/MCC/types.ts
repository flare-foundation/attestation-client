export interface RPCInterface {
  /**
   *
   */
  getTransaction(txId: string, metaData?: getTransactionOptions): any;

  /**
   * Get block height from underlying chain
   */
  getBlockHeight(): Promise<number>;

  /**
   *
   */
  isHealthy(): Promise<boolean>;

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
  createRawTransaction(walletLabel: string, vin: IIUtxoVin[], out: IIUtxoVout[]): any;

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

  isHealthy(): Promise<boolean>;
}

export interface DogeRpcInterface extends RPCInterface { }

export interface UtxoRpcInterface extends RPCInterface {
  /**
   * Default block header
   * @param blockHash
   */
  getBlockHeader(blockHash: string): any;

  /**
   * Create wallet on rpc client
   * @param walletLabel
   */
  createWallet(walletLabel: string): any;

  /**
   * Load wallet from node
   * @param walletLabel
   */
  loadWallet(walletLabel: string): any;

  /**
   *
   * @param walletLabel label of wallet, if you dont have one create one with createWallet
   * @param label label of address within wallet (default to "")
   * @param address_type type of address (default to "legacy") options = ["legacy", "p2sh-segwit", "bech32"]
   * @returns
   */
  createAddress(walletLabel: string, addressLabel?: string, address_type?: string): any;

  /**
   * List all wallets you have access to on rpc client
   */
  listAllWallets(): any;

  /**
   *
   * @param walletLabel
   * @param addressLabel
   */
  listAllAddressesByLabel(walletLabel: string, addressLabel: string): Promise<getAddressByLabelResponse[]>;

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

export enum TransactionSuccessStatus {
  SUCCESS,
  SENDER_FAILURE,
  RECEIVER_FAILURE,
  UNKNOWN
}

/**
 * Object to use in get transaction additional parameters
 */
export interface getTransactionOptions {
  verbose?: boolean;
  binary?: boolean;
  min_block?: number;
  max_block?: number;
}

export enum ChainType {
  invalid = -1,
  BTC = 0,
  LTC = 1,
  DOGE = 2,
  XRP = 3,
  ALGO = 4
  // ... make sure IDs are the same as in Flare node
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// Ripple XRP interfaces ///////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface XrpMccCreate {
  url: string;
  username?: string;
  password?: string;
  inRegTest?: boolean;
}

export interface XrpCreateAddressData { }

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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// UTXO base interfaces ////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export interface UtxoMccCreate {
  url: string;
  username: string;
  password: string;
  inRegTest?: boolean;
}

// Creating transactions
export interface IIUtxoVin {
  txid: string;
  vout: number;
  sequence?: number;
}
export interface IIUtxoVout {
  address: string;
  amount: number;
}

export interface IUtxoScriptPubKey {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string; // choices :  "witness_v0_keyhash",
  addresses: string[];
}
export interface UtxoVout {
  value: number;
  n: number;
  scriptPubKey: IUtxoScriptPubKey;
}

export interface IUtxoScriptSig {
  asm: string;
  hex: string;
}

export interface IUtxoWalletRes {
  name: string;
  warning: string;
}

export interface getAddressByLabelResponse {
  address: string;
  purpose: string; // TODO make this a choice:  "receive" |
}

export interface IUtxoTransactionListRes {
  txid: string;
  vout: number;
  address: string;
  label: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
  solvable: boolean;
  desc: string;
  safe: boolean;
}

export interface IUtxoBlockHeaderRes {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  previousblockhash: string;
  nextblockhash: string;
}

export interface IUtxoBlockRes extends IUtxoBlockHeaderRes {
  size: number;
  strippedsize: number;
  weight: number;
  tx: string[];
  nTx: number;
}

/**
 * Vin interface from transaction details requests
 */
export interface IUtxoVinTransaction {
  coinbase?: string;
  sequence: number;
  txid?: string;
  vout?: number;
  scriptSig?: IUtxoScriptSig;
  txinwitness?: string[];
}
export interface IUtxoVoutTransaction {
  value: number;
  n: number;
  scriptPubKey: IUtxoScriptPubKey;
}

export interface IUtxoGetTransactionRes {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: IUtxoVinTransaction[];
  vout: IUtxoVoutTransaction[];
  hex: string;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// ALGO interfaces /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface AlgoMccCreate {
  algod: AlgoNodeApp;
  indexer?: AlgoNodeApp;
  inRegTest?: boolean;
}

interface AlgoNodeApp {
  url: string;
  token: string;
}

export interface IAlgoStatusRes {
  catchpoint?: string;
  catchpointAcquiredBlocks?: number;
  catchpointProcessedAccounts?: number;
  catchpointTotalAccounts?: number;
  catchpointTotalBlocks?: number;
  catchpointVerifiedAccounts?: number;
  catchupTime: number;
  lastCatchpoint?: string;
  lastRound: number;
  lastVersion: string;
  nextVersion: string;
  nextVersionRound: number;
  nextVersionSupported: boolean;
  stoppedAtUnsupportedRound: boolean;
  timeSinceLastRound: number;
}

export interface IAlgoBlockData {
  earn: number;
  fees: string;
  frac: number;
  gen: string;
  gh: string;
  prev: string;
  proto: string;
  rnd: number; // block height
  rwcalr: number;
  rwd: string;
  seed: string;
  tc: number;
  ts: number;
  txn: string;
  txns: any[]; // improve
}

export interface IAlgoGetBlockRes {
  block: IAlgoBlockData;
  cert: any;
}

interface IAlgoSignature {
  sig: string;
}

interface IAlgoPaymentTransaction {
  amount: number;
  closeAmount: number;
  receiver: string;
}

export interface IAlgoTransaction {
  closeRewards: number;
  closingAmount: number;
  confirmedRound: number;
  fee: number;
  firstValid: number;
  genesisHash: string;
  genesisId: string;
  id: string;
  intraRoundOffset: number;
  lastValid: number;
  paymentTransaction: IAlgoPaymentTransaction | any; // Agint this is dependent on type of transaction
  receiverRewards: number;
  roundTime: number;
  sender: string;
  senderRewards: number;
  signature: IAlgoSignature;
  txType: string; // choices: 'pay' |
}

export interface IAlgoLitsTransaction {
  address?: string; // Only include transactions with this address in one of the transaction fields.
  addressRole?: "sender" | "receiver" | "freeze-target"; // Combine with the address parameter to define what type of address to search for.

  // Must be an RFC 3339 formatted string. Example  2019-10-12T07:20:50.52Z
  afterTime?: string; // Include results after the given time.
  beforeTime?: string; // Include results before the given time

  // Results should have an amount greater/less than this value.
  // MicroAlgos are the default currency unless an asset-id is provided,
  // in which case the asset will be used.
  currencyGreaterThan?: number;
  currencyLessThan?: number;

  // Combine with address and address-role parameters to define what type of address to search for.
  // The close to fields are normally treated as a receiver, if you would like to exclude them set
  // this parameter to true.
  excludeCloseTo?: boolean;

  applicationId?: number;
  assetId?: number;

  limit?: number; // maximum number of result to return

  maxRound?: number; // Include only results before given round (block)
  minRound?: number; // Include only results after given round (block)
  round?: number; // Include results for specific round

  next?: string; // The next page of results. Use the next token provided by the previous results.

  notePrefix?: string; // Specifies a prefix which must be contained in the note field.
  rekeyTo?: boolean; // Include results which include the rekey-to field.

  // SigType filters just results using the specified type of signature:
  // * sig - Standard
  // * msig - MultiSig
  // * lsig - LogicSig
  sigType?: "sig" | "msig" | "lsig";

  txType?: "pay" | "keyreg" | "acfg" | "axfer" | "afrz" | "appl";
  txid?: string; // Lookup specific transaction
}

export interface IAlgoGetTransactionRes {
  currentRound: number;
  transaction: IAlgoTransaction;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// Attestor client interfaces //////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface AdditionalTxRequest {
  transaction: any;
  dataAvailabilityProof: any;
  confirmations: number;
}

export interface AdditionalTransactionDetails {
  transaction: any;
  blockNumber: BN;
  blockHash: string;
  txId: string;
  sourceAddresses: string | string[][]; //
  destinationAddresses: string | string[][];
  destinationTag?: BN;
  spent: BN | BN[];
  delivered: BN | BN[];
  fee: BN;
  dataAvailabilityProof: string;
  status: TransactionSuccessStatus;
}
