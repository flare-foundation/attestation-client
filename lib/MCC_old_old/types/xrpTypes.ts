import { RateLimitOptions } from "../axios-rate-limiter/axios-rate-limit";

export interface XrpMccCreate {
  url: string;
  username?: string;
  password?: string;
  inRegTest?: boolean;
  rateLimitOptions?: RateLimitOptions;
}

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
