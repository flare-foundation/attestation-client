import { IIGetBlockRes, IIGetTransactionRes, RPCInterface } from "flare-mcc";
import { DBBlock } from "../../entity/dbBlock";
import { DBTransactionBase } from "../../entity/dbTransaction";

// TODO this is temp

export interface preprocessBlockSig {
  (block: IIGetBlockRes): Map<string, IIGetTransactionRes | null>
}

export interface readTransactionSig {
  (client: RPCInterface, txHash: string): Promise<IIGetTransactionRes>
}

export interface augmentTransactionSig {
  (client: RPCInterface, block: IIGetBlockRes, txData: IIGetTransactionRes): Promise<DBTransactionBase>
}

export interface augmentBlockSig {
  (client: RPCInterface, block: IIGetBlockRes): Promise<DBBlock>
}

export interface onSaveSig {
  (block: DBBlock, transactions: DBTransactionBase[]): Promise<boolean>
}


export interface processBlockChainFunctions {
  preProcessBlock:preprocessBlockSig; 
  readTransaction:readTransactionSig;
  augmentTransaction: augmentTransactionSig;
  augmentBlock: augmentBlockSig;  
}