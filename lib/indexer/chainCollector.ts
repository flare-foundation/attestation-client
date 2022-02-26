import { BlockBase, ChainType, IIGetBlockRes, IUtxoGetFullTransactionRes, RPCInterface } from "flare-mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { DBBlockBase } from "../entity/dbBlock";
import { DBTransactionBase } from "../entity/dbTransaction";
import { getRandom, getUnixEpochTimestamp, sleepms } from "../utils/utils";
import { augmentBlockDefault, augmentBlockUtxo } from "./chain-collector-helpers/augmentBlock";
import { augmentTransactionAlgo, augmentTransactionUtxo, augmentTransactionXrp } from "./chain-collector-helpers/augmentTransaction";
import { processBlockTransactionsGeneric } from "./chain-collector-helpers/chainCollector";
import { processBlockAlgo, processBlockDefault, processBlockXrp } from "./chain-collector-helpers/processBlock";
import { getFullTransactionUtxo, readTransactionAlgo, readTransactionUtxo, readTransactionXrp } from "./chain-collector-helpers/readTransaction";
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
    augmentTransaction: augmentTransactionAlgo, // TODO
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

export async function processBlockUtxo(
    client: CachedMccClient<any, any>,
    block: BlockBase<any>,
    onSave: onSaveSig
) {
    // we create limiting processor
    let processor = new LimitingProcessor(client)

    const augmentedTransactions: DBTransactionBase[] = []

    let txPromises = block.transactionHashes.map(async (txid) => {
        let processed = await processor.call(() => getFullTransactionUtxo(client, txid, processor)) as IUtxoGetFullTransactionRes;
        return augmentTransactionUtxo(client, block, processed);
    })

    const transDb = await Promise.all(txPromises)

    const blockDb = augmentBlockUtxo(client.client, block)

    onSave(blockDb, transDb);
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
    const blockData = new DBBlockBase;
    onSave(blockData, dataArray);
}

