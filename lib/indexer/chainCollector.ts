import { ChainType, RPCInterface } from "flare-mcc";
import { DBTransactionBase } from "../entity/dbTransaction";
import { getRandom, getUnixEpochTimestamp } from "../utils/utils";

export async function collectChainTransactionInformation(client: RPCInterface, transactionHash: string) : Promise<DBTransactionBase> {

    switch(client.chainType){
        case ChainType.BTC:
        case ChainType.LTC:
        case ChainType.DOGE:
            return await utxoCollectTransaction(client,transactionHash);
        case ChainType.ALGO:
            return await algoCollectTransaction(client,transactionHash);
        case ChainType.XRP:
            return await xrpCollectTransaction(client,transactionHash);
        default:
            throw Error("Not implemented")
    }

}

async function algoCollectTransaction(chain: RPCInterface, transactionHash: string): Promise<DBTransactionBase> {
    return {} as DBTransactionBase
}

async function utxoCollectTransaction(chain: RPCInterface, transactionHash: string): Promise<DBTransactionBase> {
    const res = new DBTransactionBase();
    res.chainType = chain.chainType;

    res.blockNumber = await getRandom();
    res.paymentReference = await getRandom().toString();
    res.timestamp = getUnixEpochTimestamp();

    res.response = "krneki";
    return res as DBTransactionBase
}

async function xrpCollectTransaction(chain: RPCInterface, transactionHash: string): Promise<DBTransactionBase> {
    return {} as DBTransactionBase
}