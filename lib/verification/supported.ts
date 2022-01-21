import { ChainType } from "../MCC/types";
import { AttestationType } from "./attestation-types";
import { isSupportedTransactionUtxo } from "./chains/UTXO";
import { isSupportedTransactionXRP } from "./chains/XRP";

export function isSupportedTransactionForAttestationType(transaction: any, chainType: ChainType, attType: AttestationType) {
    switch (chainType) {
        case ChainType.BTC:
        case ChainType.LTC:
        case ChainType.DOGE:
            return isSupportedTransactionUtxo(transaction, attType);
        case ChainType.XRP:
            return isSupportedTransactionXRP(transaction, attType);
        default:
            throw new Error("Wrong chain id!");
    }
}

