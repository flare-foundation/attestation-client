import { ChainType } from "flare-mcc";
import {
   AttestationTypeScheme, ATT_BYTES,
   CHAIN_ID_BYTES,
   DATA_AVAILABILITY_BYTES,
   TX_ID_BYTES, UTXO_BYTES
} from "./attestation-types";

export const TDEF: AttestationTypeScheme = {
   id: 1,
   supportedSources: [ChainType.XRP, ChainType.BTC, ChainType.LTC, ChainType.DOGE, ChainType.ALGO],
   name: "Payment",
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
         key: "utxo",
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
      // {
      //    key: "attestationType",
      //    type: "uint16",

      // },
      // {
      //    key: "chainId",
      //    type: "uint16"
      // },
      {
         key: "blockNumber",
         type: "uint64",
         description: 
`
Timestamp of the transaction block on the underlying chain.
`
      },
      {
         key: "blockTimestamp",
         type: "uint64",
         description:
`
Timestamp of the transaction block on the underlying chain.
`
      },
      {
         key: "transactionHash",
         type: "bytes32",
         description:
`
Hash of the transaction on the underlying chain.
`
      },
      {
         key: "utxo",
         type: "uint8",
         description:
`
Output index for transactions with multiple outputs.
`
      },
      {
         key: "sourceAddress",
         type: "bytes32",
         description:
`
In case of single source address (required for redemptions): hash of the source address as a string.
For multi-source payments (allowed for minting and topup): must be zero.
`
      },
      {
         key: "receivingAddress",
         type: "bytes32",
         description:
`
Hash of the receiving address as a string (there can only be a single address for this type).
`
      },
      {
         key: "paymentReference",
         type: "uint256",
         description:
`
Chain dependent extra data (e.g. memo field, detination tag, tx data)
For minting and redemption payment it depends on request id, 
for topup and self-mint it depends on the agent vault address.
See PaymentReference.sol for details of payment reference calculation.
`
      },
      {
         key: "spentAmount",
         type: "int256",
         description:
`
The amount that what went out of source address (or all source addresses), in smallest underlying units.
It includes both payment value and fee / gas.
`
      },
      {
         key: "receivedAmount",
         type: "uint256",
         description:
`
The amount the receiving address received, in smallest underlying units.
`
      },
      {
         key: "oneToOne",
         type: "bool",
         description:
`
True if the transaction has exactly one source address and 
exactly one receiving address (different from source).
`
      },
      {
         key: "status",
         type: "uint8",
         description:
`
Transaction success status, can have 3 values:
0 - Success
1 - Failure due to sender fault (this is the default failure)
2 - Failure due to receiver fault (bad destination address)
`
      },
   ]
}
