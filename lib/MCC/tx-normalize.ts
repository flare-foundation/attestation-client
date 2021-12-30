import { TransactionMetadata, TxResponse } from "xrpl/dist/npm/models";
import { AttestationType } from "../AttestationData";
import { ChainType } from "./MCClientSettings";
import { AdditionalTransactionDetails, RPCInterface } from "./RPCtypes";
import { UtxoTxResponse } from "./UtxoCore";
import web3 from "web3";
import BN from "bn.js";
import { loggers } from "winston";
////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////

export interface NormalizedTransactionData extends AdditionalTransactionDetails {
    attestationType: AttestationType;
    chainId: BN;
};

// export interface TransactionData extends NormalizedTransactionData{
//     type: AttestationType,
// };

export interface AttestationRequest {
    timestamp?: BN;
    instructions: BN;
    id: string;
    dataHash: string;
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
    fee?: BN;
    spent?: BN;
    delivered?: BN;
}

export interface AttestationTypeEncoding {
    sizes: number[];
    keys: string[];
    hashTypes: string[];
    hashKeys: string[];
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
    if (x === undefined || x === null) return undefined;
    if (x && x.constructor?.name === "BN") return (x as BN).toNumber();
    return x as number;
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
// Attestation request manipulation and codings
////////////////////////////////////////////////////////////////////////

// export const TX_ATT_REQ_SIZES = [16, 32, 64, 16, 128];
// export const TX_ATT_REQ_KEYS = ["attestationType", "chainId", "blockNumber", "utxo", ""];

export function attestationTypeEncodingScheme(type: AttestationType) {
    switch (type) {
        case AttestationType.FassetPaymentProof:
            return {
                sizes: [16, 32, 64, 16, 128],
                keys: ["attestationType", "chainId", "blockNumber", "utxo", ""],
                hashTypes: [
                    'uint32',  // type
                    'uint64',  // chainId
                    'uint64',  // blockNumber
                    'bytes32', // txId
                    'uint16',  // utxo
                    'string',  // sourceAddress
                    'string',  // destinationAddress
                    'uint256', // destinationTag
                    'uint256', // spent
                    'uint256', // delivered
                    'uint256'  // fee
                ],
                hashKeys: [
                    "attestationType",
                    "chainId",
                    "blockNumber",
                    "txId",
                    "utxo",
                    "sourceAddress",
                    "destinationAddress",
                    "destinationTag",
                    "spent",
                    "delivered",
                    "fee"
                ]
            }
        default:
            throw new Error("Not yet implemented!")
    }
}

export function txAttReqToAttestationRequest(
    request: TransactionAttestationRequest
) {
    let scheme = attestationTypeEncodingScheme(request.attestationType!);
    return {
        instructions: encodeToUint256(
            scheme.sizes,
            scheme.keys,
            {
                attestationType: toBN(request.attestationType as number),
                chainId: toBN(request.chainId),
                blockNumber: toBN(request.blockNumber),
                utxo: request.utxo === undefined ? undefined : toBN(request.utxo)
            }
        ),
        id: request.id,
        dataHash: request.dataHash,
        dataAvailabilityProof: request.dataAvailabilityProof
    } as AttestationRequest
}

function getAttestationTypeFromInstructions(request: AttestationRequest) {
    let typeData = decodeUint256(request.instructions, [16, 240], ["attestationType", ""]);
    return typeData.attestationType.toNumber() as AttestationType;
}

export function attReqToTransactionAttestationRequest(request: AttestationRequest) {
    let attestationType = getAttestationTypeFromInstructions(request);
    let scheme = attestationTypeEncodingScheme(attestationType!);
    let data = decodeUint256(
        request.instructions,
        scheme.sizes,
        scheme.keys
    )
    return {
        ...request,
        ...data,
        attestationType: data.attestationType.toNumber() as AttestationType
    } as TransactionAttestationRequest;
}

export function extractAttEvents(eventLogs: any[]) {
    let events: AttestationRequest[] = [];
    for (let log of eventLogs) {
        if (log.event != "AttestationRequest") {
            continue;
        }
        events.push({
            timestamp: log.args.timestamp,
            instructions: log.args.instructions,
            id: log.args.id,
            dataHash: log.args.dataHash,
            dataAvailabilityProof: log.args.dataAvailabilityProof
        })
    }
    return events;
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
        encoding = encoding.shln(sizes[i]);
        if (!keys[i]) {
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
        encoding = encoding.add(value)
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
    let keySet = new Set(keysWithoutNull);
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

export function transactionHash(
    web3: Web3, txData: NormalizedTransactionData
) {
    let scheme = attestationTypeEncodingScheme(txData.attestationType!);
    let values = scheme.hashKeys.map(key => (txData as any)[key]);
    const encoded = web3.eth.abi.encodeParameters(scheme.hashTypes, values);
    return web3.utils.soliditySha3(encoded);
    // if (txData.attestationType != AttestationType.FassetPaymentProof) throw Error("Not full transaction hash")
    // const encoded = web3.eth.abi.encodeParameters(
    //     [
    //         'uint32',  // type
    //         'uint64',  // chainId
    //         'uint64',  // blockNumber
    //         'bytes32', // txId
    //         'uint16',  // utxo
    //         'string',  // sourceAddress
    //         'string',  // destinationAddress
    //         'uint256', // destinationTag
    //         'uint256', // spent
    //         'uint256', // delivered
    //         'uint256'  // fee
    //     ],
    //     [
    //         txData.attestationType,
    //         txData.chainId,
    //         txData.blockNumber,
    //         txData.txId,
    //         txData.utxo,
    //         txData.sourceAddress,
    //         txData.destinationAddress,
    //         txData.destinationTag,
    //         txData.spent,
    //         txData.delivered,
    //         txData.fee
    //     ]
    // );
    // return web3.utils.soliditySha3(encoded);
}


////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////


export async function verifyTransactionAttestation(client: any, request: TransactionAttestationRequest) {
    if (!client) {
        throw new Error("Missing client!");
    }
    if (!(request.attestationType === AttestationType.Transaction || request.attestationType === AttestationType.FassetPaymentProof)) {
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
    // let blockResponse = await client.getBlock(txResponse.blockhash) as UtxoBlockResponse;
    let additionalData = await client.getAdditionalTransactionDetails({ transaction: txResponse, confirmations: 6, utxo: attRequest.utxo! });
    return {
        chainId: toBN(attRequest.chainId),
        attestationType: attRequest.attestationType!,
        ...additionalData
    } as NormalizedTransactionData;
}

async function verififyAttestationXRP(client: RPCInterface, attRequest: TransactionAttestationRequest) {
    let txResponse = await client.getTransaction(attRequest.id) as TxResponse;
    let additionalData = await client.getAdditionalTransactionDetails({ transaction: txResponse, confirmations: 1 });
    let result = {
        chainId: toBN(attRequest.chainId),
        attestationType: attRequest.attestationType!,
        ...additionalData
    } as NormalizedTransactionData;
    if (attRequest.instructions && attRequest.instructions.toNumber() === 0) {
        // TODO parese and verify instructions
    }
    return result;
}
