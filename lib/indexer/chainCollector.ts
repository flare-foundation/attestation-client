import { ChainType, IXrpGetBlockRes, IXrpGetFullTransactionRes, RPCInterface } from "flare-mcc";
import { DBBlock } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { getRandom, getUnixEpochTimestamp, sleepms } from "../utils/utils";
import { augmentBlockDefault } from "./chain-collector-helpers/augmentBlock";
import { xrpCollectTransaction } from "./chain-collector-helpers/augmentTransaction";
import { processBlockTransactionsGeneric } from "./chain-collector-helpers/chainCollector";
import { processBlockXrp } from "./chain-collector-helpers/processBlock";
import { readTransactionXrp } from "./chain-collector-helpers/readTransaction";
import { onSaveSig, processBlockChainFunctions } from "./chain-collector-helpers/types";

const processBlockXrpFunction: processBlockChainFunctions<IXrpGetBlockRes, IXrpGetFullTransactionRes> = {
    preProcessBlock: processBlockXrp,
    readTransaction: readTransactionXrp,
    augmentTransaction: xrpCollectTransaction,
    augmentBlock: augmentBlockDefault
}

export function getChainProcesBlockFunctions<B, T>(chainType: ChainType) {
    switch (chainType) {
        case ChainType.XRP:
            return processBlockXrpFunction as any as processBlockChainFunctions<B, T>;
        case ChainType.BTC:
        case ChainType.LTC:
        case ChainType.DOGE:
        case ChainType.ALGO:
        default:
            return null;
    }
}

export async function processBlock<B>(
    client: RPCInterface,
    block: B,
    onSave: onSaveSig
) {

    const functions = getChainProcesBlockFunctions(client.chainType);

    return processBlockTransactionsGeneric<B, any>(
        client,
        block,
        functions.preProcessBlock,
        functions.readTransaction,
        functions.augmentTransaction,
        functions.augmentBlock,
        onSave
    )
}

export async function processBlockTest<B>(
    client: RPCInterface,
    block: B,
    onSave: onSaveSig
) {

    await sleepms(100);

    const blocks = 1 + await getRandom(10);

    const dataArray = Array<DBTransactionBase>();

    for (let a = 0; a < blocks; a++) {
        const data = new DBTransactionBase();

        data.timestamp = getUnixEpochTimestamp();
        data.paymentReference = getRandom().toString();

        dataArray.push(data);
    }

    const blockData = new DBBlock;

    onSave(blockData, dataArray);
}

