import { RPCInterface } from "flare-mcc";
import { DBTransactionBase } from "../../entity/dbTransaction";

// TODO this is temp
export interface DBBlockBase {
  number: number,
  saved: boolean
}

export interface preprocessBlockSig<B, T> {
  (block: B): Map<string, T | null>
}

export interface readTransactionSig<T> {
  (client: RPCInterface, txHash: string): Promise<T>
}

export interface augmentTransactionSig<B, T> {
  (client: RPCInterface, block: B, txData: T): Promise<DBTransactionBase>
}

export interface augmentBlockSig<B> {
  (client: RPCInterface, block: B): Promise<DBBlockBase>
}

export interface onSaveSig {
  (transactions: DBTransactionBase[]): Promise<boolean>
}


export interface processBlockChainFunctions<B,T> {
  preProcessBlock:preprocessBlockSig<B, T>; 
  readTransaction:readTransactionSig<T>;
  augmentTransaction: augmentTransactionSig<B, T>;
  augmentBlock: augmentBlockSig<B>;  
}