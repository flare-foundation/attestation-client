import { ChainType, sleep } from "flare-mcc";
import { DBTransactionBase } from "../entity/dbTransaction";
import { getRandom, getUnixEpochTimestamp } from "../utils/utils";

export async function collectChainTransactionInformation(chain: ChainType, transactionHash: string) : Promise<DBTransactionBase> {

    const res = new DBTransactionBase();

    res.chainType = chain;
    res.blockNumber = await getRandom();
    res.paymentReference = await getRandom().toString();
    res.timestamp = getUnixEpochTimestamp();

    res.response = "krneki";

    await sleep( 100 );

    return res;
}