import { IIGetBlockRes, IIGetTransactionRes, ReadRpcInterface } from "flare-mcc";
import { DBBlockBase } from "../../entity/dbBlock";
import { DBTransactionBase } from "../../entity/dbTransaction";

// TODO this is temp

export interface preprocessBlockSig {
  (block: IIGetBlockRes): Map<string, IIGetTransactionRes | null>
}

export interface readTransactionSig {
  (client: ReadRpcInterface, txHash: string): Promise<IIGetTransactionRes>
}

export interface augmentTransactionSig {
  (client: ReadRpcInterface, block: IIGetBlockRes, txData: IIGetTransactionRes): Promise<DBTransactionBase>
}

export interface augmentBlockSig {
  (client: ReadRpcInterface, block: IIGetBlockRes): Promise<DBBlockBase>
}

export interface onSaveSig {
  (block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean>
}


export interface processBlockChainFunctions {
  preProcessBlock:preprocessBlockSig; 
  readTransaction:readTransactionSig;
  augmentTransaction: augmentTransactionSig;
  augmentBlock: augmentBlockSig;  
}