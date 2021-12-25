import { Payment, TransactionMetadata, TxResponse } from "xrpl/dist/npm/models";
import { AttestationType } from "../AttestationData";
import { ChainType } from "./MCClientSettings";
import { RPCInterface } from "./RPCtypes";
import { UtxoBlockHeaderResponse, UtxoBlockResponse, UtxoTxResponse } from "./UtxoCore";

////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////

export type NormalizedTransactionData = {
    attestationType: AttestationType,
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

export type TransactionData = {
    type: AttestationType,
} & NormalizedTransactionData;

export interface AttestationRequest {
    instructions: BN;
    id: string;
    dataAvailabilityProof: string;
    attestationType?: AttestationType;
}

export interface TransactionAttestationRequest extends AttestationRequest {
    chainId: BN | number;
    blockNumber: BN | number;
    utxo?: BN | number;
}

export interface VerifiedAttestation {
    chainType: ChainType;
    attestType: AttestationType;
    txResponse?: any;
    blockResponse?: any;
    sender?: string;
    utxo?: number;
    fee?: BN
}

////////////////////////////////////////////////////////////////////////
// Auxiliary
////////////////////////////////////////////////////////////////////////

export function prettyPrint(normalized: NormalizedTransactionData) {
    let res: any = {}
    for (let key in normalized) {
        let obj = (normalized as any)[key];
        if (typeof obj === 'object') {
            res[key] = (normalized as any)[key]?.toString()
        } else {
            res[key] = (normalized as any)[key]
        }
    }
    console.log(JSON.stringify(res, null, 2))
}

export function toBN(x: string | number | BN) {
    if (x && x.constructor?.name === "BN") return x as BN;
    return web3.utils.toBN(x as any);
}

export function toNumber(x: number | BN | undefined | null) {
    if(x === undefined || x === null) return undefined;
    if (x && x.constructor?.name === "BN") return (x as BN).toNumber();
    return x;
}

////////////////////////////////////////////////////////////////////////
// Payment verification
////////////////////////////////////////////////////////////////////////

export function verifyXRPPayment(transaction: any) {
    if (!(transaction.metaData || transaction.meta)) {
        // console.log("E-1");
        return false
    };
    if (transaction.TransactionType != "Payment") {
        // console.log("E-2");
        return false;
    }
    let meta = transaction.metaData || transaction.meta;
    if (typeof meta === "string") {
        // console.log("E-3");
        return false;
    }
    if (typeof (meta as TransactionMetadata).delivered_amount != "string") {
        // console.log("E-4");
        return false;
    }
    if (meta!.TransactionResult != 'tesSUCCESS') {
        // console.log("E-5");
        return false;
    }
    return true;
}


////////////////////////////////////////////////////////////////////////
// Attestation request manipulation
////////////////////////////////////////////////////////////////////////

export const TX_ATT_REQ_SIZES = [16, 32, 64, 16, 128];
export const TX_ATT_REQ_KEYS = ["attestationType", "chainId", "blockNumber", "utxo", ""];

export function txAttReqToAttestationRequest(
    request: TransactionAttestationRequest
) {
    return {
        instructions: encodeToUint256(
            TX_ATT_REQ_SIZES,
            TX_ATT_REQ_KEYS,
            {
                attestationType: toBN(request.attestationType as number),
                chainId: toBN(request.chainId),
                blockNumber: toBN(request.blockNumber),
                utxo: request.utxo === undefined ? undefined : toBN(request.utxo)
            }
        ),
        id: request.id,
        dataAvailabilityProof: request.dataAvailabilityProof
    } as AttestationRequest
}

export function attReqToTransactionAttestationRequest(request: AttestationRequest) {
    let data = decodeUint256(
        request.instructions,
        TX_ATT_REQ_SIZES,
        TX_ATT_REQ_KEYS
    )
    return {
        ...request,
        ...data
    } as TransactionAttestationRequest;
}

export function encodeToUint256(sizes: number[], keys: string[], valueObject: any) {
    if (sizes.length != keys.length) {
        throw new Error("Sizes do not match");
    }
    if (sizes.reduce((a, b) => a + b) != 256) {
        throw new Error("Sizes do not add up to 256")
    }
    let encoding = toBN(0);
    for (let i = 0; i < sizes.length; i++) {
        if (sizes[i] <= 0) {
            throw new Error("To small size");
        }
        if (!keys[i]) {
            encoding = encoding.shln(sizes[i]);
            continue;
        }
        let val = valueObject[keys[i]];
        // If value for a key is not provided, its value is considered 0 as BN
        let value = toBN(0);
        if (val && val.constructor?.name === "BN") {
            if (val.shrn(sizes[i]).gt(toBN(0))) {
                throw new Error(`Value ${value} overflows size ${sizes[i]} on index ${i}.`)
            } else {
                value = val as BN;
            }
        } else if (val) {
            throw new Error("Wrong type of value")
        }
        encoding = encoding.add(value).shln(sizes[i]);
    }
    return encoding;
}

export function decodeUint256(encoding: BN, sizes: number[], keys: string[]) {
    if (sizes.length != keys.length) {
        throw new Error("Sizes do not match");
    }
    if (sizes.reduce((a, b) => a + b) != 256) {
        throw new Error("Sizes do not add up to 256")
    }
    let keysWithoutNull = keys.filter(x => !!x);
    let keySet = new Set(...keysWithoutNull);
    if (keysWithoutNull.length != keySet.size) {
        throw new Error("Duplicate non-null keys are not allowed")
    }
    let decoded: any = {};
    for (let i = sizes.length - 1; i >= 0; i--) {
        let mask = toBN(0).bincn(sizes[i]).sub(toBN(1));
        decoded[keys[i]] = encoding.and(mask);
        encoding = encoding.shrn(sizes[i]);
    }
    return decoded;
}

////////////////////////////////////////////////////////////////////////
// Normalization
////////////////////////////////////////////////////////////////////////

function normalizeXRP(att: VerifiedAttestation): NormalizedTransactionData | null {
    const txResponse = att.txResponse as TxResponse;
    if (!verifyXRPPayment(txResponse.result)) return null;
    let payment = txResponse.result as Payment;
    let amount = toBN((txResponse.result.meta! as TransactionMetadata).delivered_amount as string); // XRP in drops

    // console.log(web3.utils.asciiToHex(payment.Account))
    // console.log("0x" + txResponse.result.hash)
    // console.log(web3.utils.sha3(payment.Account))
    return {
        attestationType: att.attestType,
        chainId: toBN(ChainType.XRP),  // chainId = 3 for XRP
        blockNumber: toBN(txResponse.result.ledger_index || 0),
        txId: "0x" + txResponse.result.hash,
        utxo: 0,
        sourceAddress: payment.Account,
        destinationAddress: payment.Destination,
        destinationTag: toBN(payment.DestinationTag || 0),
        amount,
        gasOrFee: att.fee
    } as NormalizedTransactionData
}

async function normalizeUTXO(att: VerifiedAttestation) {
    const txResponse = att.txResponse as UtxoTxResponse;
    const blockResponse = att.blockResponse as UtxoBlockHeaderResponse;
    if(att.utxo === null || att.utxo === undefined) {
        throw new Error("Utxo not defined.")
    }
    if(att.utxo < 0 || att.utxo >= txResponse.vout.length) {
        throw new Error(`Utxo ${att.utxo} out of range [0, ${txResponse.vout.length - 1}]`)
    }
    return {
        attestationType: att.attestType,
        chainId: toBN(att.chainType as number),
        blockNumber: toBN(blockResponse.height || 0),
        txId: "0x" + txResponse.txid,
        utxo: att.utxo,
        sourceAddress: att.sender,
        destinationAddress: txResponse.vout[att.utxo!].scriptPubKey.addresses[0],
        destinationTag: toBN(0),
        amount: toBN(Math.round(txResponse.vout[att.utxo!].value * 100000000)),
        gasOrFee: att.fee
    } as NormalizedTransactionData
}

////////////////////////////////////////////////////////////////////////
// Normalization
////////////////////////////////////////////////////////////////////////


export async function verifyTransactionAttestation(client: any, request: TransactionAttestationRequest) {
    if (!client) {
        throw new Error("Missing client!");
    }
    if (!(request.attestationType === AttestationType.Transaction || request.attestationType === AttestationType.TransactionFull)) {
        throw new Error("Wrong attestation Type")
    }
    let chainId = toNumber(request.chainId) as ChainType;
    switch (chainId) {
        case ChainType.BTC:
        case ChainType.LTC:
        case ChainType.DOGE:
            return verififyAttestationUtxo(client, request);
        case ChainType.XRP:
            return verififyAttestationXRP(client, request);
        default:
            throw new Error("Wrong chain id!")
    }
}

async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest) {
    let txResponse = await client.getTransaction(attRequest.id, { verbose: true }) as UtxoTxResponse;
    let blockResponse = await client.getBlock(txResponse.blockhash) as UtxoBlockResponse;
    let additionalData = await client.getAdditionalTransactionDetails(txResponse);
    return normalizeUTXO({
        chainType: toNumber(attRequest.chainId) as ChainType,
        attestType: attRequest.attestationType,
        txResponse,
        blockResponse,
        utxo: toNumber(attRequest.utxo),
        sender: additionalData.sender,
        fee: additionalData.fee
    } as VerifiedAttestation)
}

async function verififyAttestationXRP(client: RPCInterface, attRequest: TransactionAttestationRequest) {
    let txResponse = await client.getTransaction(attRequest.id) as TxResponse;
    let additionalData = await client.getAdditionalTransactionDetails(txResponse);
    return normalizeXRP({
        chainType: toNumber(attRequest.chainId) as ChainType,
        attestType: attRequest.attestationType,
        txResponse,
        ...additionalData
    } as VerifiedAttestation)
}





// export function positionMask(n: BN, start: number, end: number): BN {
//     let top = toBN(0).bincn(256-start).sub(toBN(1))
//     let bottom = toBN(0).bincn(256-end).sub(toBN(1)).notn(256);
//     return top.or(bottom).and(n);
// }

// export function setBitMask(start: number, end: number, width = 256): BN {
//     let top = toBN(0).bincn(width-start).sub(toBN(1))
//     let bottom = toBN(0).bincn(width-end).sub(toBN(1)).notn(width);
//     return top.and(bottom);
// }

// export function clearBits(n: BN, start: number, end: number, width = 256) {
//     let mask = setBitMask(start, end, width);
//     return mask.notn(width).and(n);
// }

// export function setBits(n: BN, value: BN, start: number, end: number, width = 256) {

// }


// function basicParse(request: AttestationRequest): AttestationRequest {
//     return {
//         ...request,
//         attestationType: extractBitsFromLeft(request.instructions, 0, 15).toNumber() as AttestationType
//     }
// }

// function parseAttestatonRequest(request: AttestationRequest) {
//     let basic = basicParse(request);
//     switch (basic.attestationType) {
//         case AttestationType.TransactionFull:
//         case AttestationType.Transaction:
//             return {
//                 ...basic,
//                 chainId: extractBitsFromLeft(basic.instructions, 16, 47),  // 32 bit
//                 blockNumber: extractBitsFromLeft(basic.instructions, 48, 111), // 64 bit
//                 utxo: extractBitsFromLeft(basic.instructions, 112, 128)  // 16 bit
//             }
//         default:
//             throw new Error("Not yet implemented!")
//     }
// }

// export function extractBitsFromLeft(n: BN, start: number, end: number): BN {
//     return n.shln(start).shrn(256 - end + 1 + start)
// }

// export function wrapNormalizedTx(normalizedTxData: NormalizedTransactionData, type: AttestationType) {
//     return { type, ...normalizedTxData } as TransactionData;
// }
