import { base64ToHex, ChainType, RPCInterface, sleep, txIdToHexNo0x } from "flare-mcc";
import { IalgoGetFulTransactionRes } from "flare-mcc/dist/types/algoTypes";
import { IUtxoGetFullTransactionRes } from "flare-mcc/dist/types/utxoTypes";
import { DBTransactionBase } from "../entity/dbTransaction";
import { getRandom, getUnixEpochTimestamp } from "../utils/utils";

export async function collectChainTransactionInformation(client: RPCInterface, transactionHash: string) : Promise<DBTransactionBase> {

    // switch(client.chainType){
    //     case ChainType.BTC:
    //     case ChainType.LTC:
    //     case ChainType.DOGE:
    //         return await utxoCollectTransaction(client,transactionHash);
    //     case ChainType.ALGO:
    //         return await algoCollectTransaction(client,transactionHash);
    //     case ChainType.XRP:
    //         return await xrpCollectTransaction(client,transactionHash);
    //     default:
    //         throw Error("Not implemented")
    // }

    await sleep( 100 );

    const data = new DBTransactionBase();

    data.timestamp=getUnixEpochTimestamp();
    data.paymentReference=getRandom().toString();

    return data;
}


async function algoCollectTransaction(client: RPCInterface, transactionHash: string): Promise<DBTransactionBase> {
    const fullTransaction = client.getFullTransaction(transactionHash) as IalgoGetFulTransactionRes;
    const res = new DBTransactionBase();

    res.chainType = client.chainType;

    // Algo specific conversion of transaction hashes to hex 
    res.transactionId = txIdToHexNo0x(transactionHash);

    // If there is note other
    res.paymentReference = base64ToHex(fullTransaction.note || "")
    res.timestamp = fullTransaction.roundTime || 0

    res.response = JSON.stringify(fullTransaction)
    return res as DBTransactionBase
}

async function utxoCollectTransaction(client: RPCInterface, transactionHash: string): Promise<DBTransactionBase> {
    const fullTransaction = client.getFullTransaction(transactionHash) as IUtxoGetFullTransactionRes;
    const res = new DBTransactionBase();
    
    res.chainType = client.chainType;
    res.transactionId = transactionHash;

    const paymentRef = client.getTransactionRefFromTransaction(fullTransaction)
    if(paymentRef.length === 1){
        res.paymentReference = paymentRef[0]
    }
    // we get block number on top level when we add transactions from indexer into processing queue
    // res.blockNumber = await getRandom();
    
    res.timestamp = fullTransaction.blocktime

    res.response = JSON.stringify(fullTransaction)
    return res as DBTransactionBase
}

async function xrpCollectTransaction(client: RPCInterface, transactionHash: string): Promise<DBTransactionBase> {
    const fullTransaction = client.getFullTransaction(transactionHash);
    const res = new DBTransactionBase();

    res.chainType = client.chainType;
    res.transactionId = transactionHash;

    res.response = JSON.stringify(fullTransaction)
    return res as DBTransactionBase
}