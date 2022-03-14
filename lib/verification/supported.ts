// import { ChainType } from "flare-mcc";
// import { isSupportedTransactionUtxo } from "./chains/UTXO/supported.utxo";
// import { isSupportedTransactionXRP } from "./chains/XRP/supported.xrp";
// import { AttestationType } from "./generated/attestation-types-enum";

// export function isSupportedTransactionForAttestationType(transaction: any, chainType: ChainType, attType: AttestationType) {
//   switch (chainType) {
//     case ChainType.BTC:
//     case ChainType.LTC:
//     case ChainType.DOGE:
//       return isSupportedTransactionUtxo(transaction, attType);
//     case ChainType.XRP:
//       return isSupportedTransactionXRP(transaction, attType);
//     default:
//       throw new Error("Wrong chain id!");
//   }
// }
