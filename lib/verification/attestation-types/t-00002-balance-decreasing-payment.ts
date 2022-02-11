import { AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES, DATA_AVAILABILITY_BYTES, TX_ID_BYTES, UTXO_BYTES } from "./attestation-types";

export const TDEF: AttestationTypeScheme = {
   id: 2,
   name: "BalanceDecreasingPayment",
   request: [
      {
         key: "attestationType",
         size: ATT_BYTES,
         type: "AttestationType"
      },
      {
         key: "chainId",
         size: CHAIN_ID_BYTES,
         type: "ChainType"
      },
      {
         key: "inUtxo",
         size: UTXO_BYTES,
         type: "NumberLike"
      },
      {
         key: "id",
         size: TX_ID_BYTES,
         type: "BytesLike"
      },
      {
         key: "dataAvailabilityProof",
         size: DATA_AVAILABILITY_BYTES,
         type: "BytesLike"
      },
   ],
   dataHashDefinition: [
      {
         key: "attestationType",
         type: "uint16"
      },
      {
         key: "chainId",
         type: "uint16"
      },
      {
         key: "blockNumber",
         type: "uint64"
      },
      {
         key: "blockTimestamp",
         type: "uint64"
      },
      {
         key: "txId",
         type: "bytes32"
      },
      {
         key: "sourceAddress",
         type: "bytes32"
      },
      {
         key: "sourceAddressChecksum",
         type: "bytes4"
      },
      {
         key: "sourceAddressChecksum",
         type: "bytes4"
      },
      {
         key: "spent",
         type: "int256"
      },
   ]
}

