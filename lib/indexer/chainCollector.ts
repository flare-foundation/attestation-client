import { ChainType, IIGetBlockRes, RPCInterface } from "flare-mcc";
import { augmentBlockDefault } from "./chain-collector-helpers/augmentBlock";
import { augmentTransactionAlgo, augmentTransactionUtxo, augmentTransactionXrp } from "./chain-collector-helpers/augmentTransaction";
import { processBlockTransactionsGeneric } from "./chain-collector-helpers/chainCollector";
import { processBlockAlgo, processBlockDefault, processBlockXrp } from "./chain-collector-helpers/processBlock";
import { readTransactionAlgo, readTransactionUtxo, readTransactionXrp } from "./chain-collector-helpers/readTransaction";
import { onSaveSig, processBlockChainFunctions } from "./chain-collector-helpers/types";

export const XrpProcessBlockFunction: processBlockChainFunctions = {
    preProcessBlock: processBlockXrp,
    readTransaction: readTransactionXrp,
    augmentTransaction: augmentTransactionXrp,
    augmentBlock: augmentBlockDefault
}

export const AlgoProcessBlockFunction: processBlockChainFunctions = {
    preProcessBlock: processBlockAlgo,
    readTransaction: readTransactionAlgo,
    augmentTransaction: augmentTransactionAlgo,
    augmentBlock: augmentBlockDefault
}

export const UtxoProcessBlockFunction: processBlockChainFunctions = {
    preProcessBlock: processBlockDefault,
    readTransaction: readTransactionUtxo,
    augmentTransaction: augmentTransactionUtxo,
    augmentBlock: augmentBlockDefault
}

export function getChainProcesBlockFunctions(chainType: ChainType) {
    switch (chainType) {
        case ChainType.XRP:
            return XrpProcessBlockFunction as processBlockChainFunctions;
        case ChainType.BTC:
        case ChainType.LTC:
        case ChainType.DOGE:
            return UtxoProcessBlockFunction as processBlockChainFunctions;
        case ChainType.ALGO:
            return AlgoProcessBlockFunction as processBlockChainFunctions;
        default:
            return null;
    }
}

export async function processBlock(
    client: RPCInterface,
    block: IIGetBlockRes,
    onSave: onSaveSig
) {

    const functions = getChainProcesBlockFunctions(client.chainType);

    return processBlockTransactionsGeneric(
        client,
        block,
        functions.preProcessBlock,
        functions.readTransaction,
        functions.augmentTransaction,
        functions.augmentBlock,
        onSave
    )
}

// export async function processBlockTest<B>(
//     client: RPCInterface,
//     block: B,
//     onSave: onSaveSig
// ) {

//     await sleepms(100);

//     const blocks = 1 + await getRandom(10);

//     const dataArray = Array<DBTransactionBase>();

//     for (let a = 0; a < blocks; a++) {
//         const data = new DBTransactionBase();

//         data.timestamp = getUnixEpochTimestamp();
//         data.paymentReference = getRandom().toString();

//         dataArray.push(data);
//     }

//     onSave(dataArray);
// }

