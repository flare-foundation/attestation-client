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
