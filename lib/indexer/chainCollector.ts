import { IAlgoGetBlockRes, IUtxoGetBlockRes, IXrpGetBlockRes, RPCInterface } from "flare-mcc";
import { augmentBlockSwitch } from "./chain-collector-helpers/augmentBlock";
import { augmentTransactionSwitch } from "./chain-collector-helpers/augmentTransaction";
import { processBlockTransactionsGeneric } from "./chain-collector-helpers/chainCollector";
import { processBlockSwitch } from "./chain-collector-helpers/processBlock";
import { readTransactionSwitch } from "./chain-collector-helpers/readTransaction";
import { onSaveSig } from "./chain-collector-helpers/types";


export async function processBlock<B>(
   client: RPCInterface,
   block: B,
   onSave: onSaveSig
) {
   const preProcessBlock = processBlockSwitch(client.chainType);
   const readTransaction = readTransactionSwitch(client.chainType);
   const augmentTransaction = augmentTransactionSwitch(client.chainType);
   const augmentBlock = augmentBlockSwitch(client.chainType);

   return processBlockTransactionsGeneric<B,any>(
      client,
      block,
      preProcessBlock,
      readTransaction,
      // @ts-ignore
      augmentTransaction,
      augmentBlock,
      onSave
   )
}
