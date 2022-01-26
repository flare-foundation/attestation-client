import BN from "bn.js";
import { formatDiagnostic } from "typescript";
import { getAddressByLabelResponse, IIUtxoVin, IIUtxoVout } from "./types/utxoTypes";

interface ReadRpcInterface {
  // general methods
  isHealthy(): Promise<boolean>;

  // Block data
  getBlock(blockNumberOrHash: number | string): any;
  getBlockHeight(): Promise<number>;
  getBlockHash(block: any): string;

  // Transaction data
  getTransaction(txId: string, metaData?: getTransactionOptions): any;
  listTransactions?(options?: any): any;
  getTransactionHashesFromBlock(block: any): string[];

  // Flare attestation helpers
  getAdditionalTransactionDetails(request: AdditionalTxRequest): Promise<AdditionalTransactionDetails>;
}

interface WriteRpcInterface {
  // wallets

  // addresses
  createAddress(createAddressData: any): any;

  // transactions
  createRawTransaction(walletLabel: string, vin: IIUtxoVin[], out: IIUtxoVout[]): any;
  signRawTransaction(walletLabel: string, rawTx: string, keysList: string[]): any;
  sendRawTransaction(walletLabel: string, signedRawTx: string): any;
  sendRawTransactionInBlock(walletLabel: string, signedRawTx: string): any;

  // faucet
  fundAddress(address: string, amount: number): any;
}

export interface RPCInterface extends ReadRpcInterface, WriteRpcInterface {}

export interface DogeRpcInterface extends RPCInterface {}

export interface UtxoRpcInterface extends RPCInterface {
  getBlockHeader(blockHash: string): any;

  createWallet(walletLabel: string): any;

  loadWallet(walletLabel: string): any;

  createAddress(walletLabel: string, addressLabel?: string, address_type?: string): any;

  listAllWallets(): any;

  listAllAddressesByLabel(walletLabel: string, addressLabel: string): Promise<getAddressByLabelResponse[]>;

  listUnspentTransactions(walletLabel: string, min: number, max: number): any;

  getPrivateKey(walletLabel: string, address: string): any;
}

export enum TransactionSuccessStatus {
  SUCCESS,
  SENDER_FAILURE,
  RECEIVER_FAILURE,
  UNKNOWN,
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
  ALGO = 4,
  // ... make sure IDs are the same as in Flare node
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// Ripple XRP interfaces ///////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export { XrpMccCreate, XrpCreateAddressData, XrpGetTransactionResponse } from "./types/xrpTypes";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// UTXO base interfaces ////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export {
  UtxoMccCreate,
  IIUtxoVin,
  IIUtxoVout,
  IUtxoScriptPubKey,
  UtxoVout,
  IUtxoScriptSig,
  IUtxoWalletRes,
  getAddressByLabelResponse,
  IUtxoTransactionListRes,
  IUtxoBlockHeaderRes,
  IUtxoBlockRes,
  IUtxoVinTransaction,
  IUtxoVoutTransaction,
  IUtxoGetTransactionRes,
} from "./types/utxoTypes";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// ALGO interfaces /////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export {
  AlgoMccCreate,
  IAlgoStatusRes,
  IAlgoBlockHeaderData,
  IAlgoBlockData,
  IAlgoGetBlockHeaderRes,
  IAlgoGetBlockRes,
  IAlgoSignature,
  IAlgoPaymentTransaction,
  IAlgoTransaction,
  IAlgoLitsTransaction,
  IAlgoGetTransactionRes,
  IAlgoListTransactionRes,
} from "./types/algoTypes";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////// Attestor client interfaces //////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface AdditionalTxRequest {
  transaction: any;
  getDataAvailabilityProof?: boolean;
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
  dataAvailabilityProof?: string;
  dataAvailabilityBlockOffset?: number;
  status: TransactionSuccessStatus;
}
