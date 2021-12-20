import { TransactionMetadata, TxResponse } from "xrpl/dist/npm/models";
import { ChainType } from "./MCClientSettings";
import { UtxoBlockResponse, UtxoTxResponse } from "./UtxoCore";

export type NormalizedTransactionData = {
    chainId: BN,
    blockNumber: BN,
    txId: string,
    utxo: number,
    sourceAddress: string,
    destinationAddress: string,
    destinationTag: BN,
    amount: BN,
    gasOrFee: BN
}

export enum ChainTransactionType {
    FULL = 0,
    PARTIAL = 1
}

export type TransactionData = {
    type: ChainTransactionType,
} & NormalizedTransactionData;

export function wrapNormalizedTx(normalizedTxData: NormalizedTransactionData, type: ChainTransactionType) {
    return { type, ...normalizedTxData } as TransactionData;
}

const toBN = web3.utils.toBN

export function normalizeTransaction(chainType: ChainType, type: ChainTransactionType, txResponse: any, blockResponse?: any): TransactionData | null {
    let normalized: NormalizedTransactionData | null;
    switch (chainType) {
        // case ChainType.BTC:
        //     throw Error("Not yet implemented")
        // case ChainType.LTC:
        //     throw Error("Not yet implemented")
        // case ChainType.DOGE:
        //     throw Error("Not yet implemented")
        case ChainType.XRP:
            normalized = normalizeXRP(txResponse as TxResponse);
            break;
        default:
            normalized = normalizeUTXO(chainType,  txResponse, blockResponse);
            break;            
    }
    if(!normalized) {
        return null;
    }
    return wrapNormalizedTx(normalized, type);
}

function normalizeXRP(txResponse: TxResponse): NormalizedTransactionData | null {
    if (txResponse.result.TransactionType != "Payment") {
        return null;
    }    
    let amount: BN = toBN(0);

    if (txResponse.result.meta)

        // No issued currency support. Just pure XRP
        if (typeof txResponse.result.meta != "string" && typeof (txResponse.result.meta as TransactionMetadata).delivered_amount === "string") {
            // transaction not successful{
            if (txResponse.result.meta.TransactionResult != 'tesSUCCESS') {
                return null;
            }
            amount = toBN(txResponse.result.meta.delivered_amount as string); // XRP in drops
        } else {
            // transaction not in supported format
            return null;
        }

    return {
        chainId: toBN(ChainType.XRP),  // chainId = 3 for XRP
        blockNumber: toBN(txResponse.result.ledger_index || 0),
        txId: "0x" + txResponse.result.hash,
        utxo: 0,
        sourceAddress: txResponse.result.Account,
        destinationAddress: txResponse.result.Destination,
        destinationTag: toBN(txResponse.result.DestinationTag || 0),
        amount,
        gasOrFee: toBN(txResponse.result.Fee!)
    } as NormalizedTransactionData
}

function normalizeUTXO(chainType: ChainType, txResponse: UtxoTxResponse, blockResponse: UtxoBlockResponse): NormalizedTransactionData | null {
    console.log(txResponse.vin)
    // const amount = Math.floor(parseFloat(tx.result.vout[voutN].value).toFixed(8)*Math.pow(10,8));
    // tx.result.vout[voutN].scriptPubKey.addresses[0], '\n',

    // return {
    //     chainId: toBN(chainType), 
    //     blockNumber: toBN(blockResponse.height || 0),
    //     txId: "0x" + txResponse.hash,
    //     utxo: 0,
    //     sourceAddress: res.result.Account,
    //     destinationAddress: res.result.Destination,
    //     destinationTag: toBN(res.result.DestinationTag || 0),
    //     amount,
    //     gasOrFee: toBN(res.result.Fee!)
    // } as NormalizedTransactionData
    return null;
}