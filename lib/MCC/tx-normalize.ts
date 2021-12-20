import { Verify } from "crypto";
import { TransactionMetadata, TxResponse } from "xrpl/dist/npm/models";
import { ChainType } from "./MCClientSettings";
import { UtxoBlockResponse, UtxoTxResponse } from "./UtxoCore";

export type NormalizedTransactionData = {
    attestationType: AttestTransactionType,
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

export enum AttestTransactionType {
    FULL = 0,
    PARTIAL = 1
}

export type TransactionData = {
    type: AttestTransactionType,
} & NormalizedTransactionData;

export function wrapNormalizedTx(normalizedTxData: NormalizedTransactionData, type: AttestTransactionType) {
    return { type, ...normalizedTxData } as TransactionData;
}

const toBN = web3.utils.toBN

export interface VerifiedAttestation {
    chainType: ChainType;
    attestType: AttestTransactionType;
    txResponse?: any, 
    blockResponse?: any, 
    utxo?: number,
    client?: any
}

export async function normalizeTransaction(att: VerifiedAttestation) {
//: NormalizedTransactionData | null {
    let normalized: NormalizedTransactionData | null;
    switch (att.chainType) {
        // case ChainType.BTC:
        //     throw Error("Not yet implemented")
        // case ChainType.LTC:
        //     throw Error("Not yet implemented")
        // case ChainType.DOGE:
        //     throw Error("Not yet implemented")
        case ChainType.XRP:
            normalized = normalizeXRP(att);
            break;
        default:
            normalized = await normalizeUTXO(att);
            break;            
    }
    if(!normalized) {
        return null;
    }
    return normalized;
    // return wrapNormalizedTx(normalized, type);
}

function normalizeXRP(att: VerifiedAttestation): NormalizedTransactionData | null {
    const txResponse = att.txResponse as TxResponse;
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
        attestationType: att.attestType,
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

async function normalizeUTXO(att: VerifiedAttestation) {
//: NormalizedTransactionData | null {
    const txResponse = att.txResponse as UtxoTxResponse;
    console.log("TX RESP:", txResponse)
    console.log("VOUTs", txResponse.vout)
    console.log("VOUT ADDRESSES", txResponse.vout.map(x => x.scriptPubKey.addresses))
    console.log("VINs", txResponse.vin)
    let txes = txResponse.vin.map((x: any) => {
        return {
            txid: x.txid,
            vout: x.vout
        }
    })
    console.log("TXES", txes)
    let client = att.client;
    console.log("IN ADDRESSES")
    for(let txid of txes) {
        let rsp = await client.chainClient.getTransaction(txid.txid, {verbose: true}) as UtxoTxResponse;
        console.log("RESP2:", rsp);
        console.log("RESP2-XXX:", rsp.vout.map((x: any) => x.scriptPubKey.addresses));
        let add = rsp.vout[txid.vout].scriptPubKey.addresses//.map(x => x.scriptPubKey.addresses[])
        console.log(add)
    }
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