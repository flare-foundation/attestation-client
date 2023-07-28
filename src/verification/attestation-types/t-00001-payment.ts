import { SourceId } from "../sources/sources";
import { AttestationTypeScheme, BLOCKNUMBER_BYTES, TX_ID_BYTES, UTXO_BYTES } from "./attestation-types";

export const TDEF: AttestationTypeScheme = {
  id: 1,
  supportedSources: [SourceId.XRP, SourceId.BTC, SourceId.LTC, SourceId.DOGE, SourceId.ALGO],
  name: "Payment",
  request: [
    {
      key: "id",
      size: TX_ID_BYTES,
      type: "ByteSequenceLike",
      description: `
Transaction hash to search for.
`,
    },
    {
      key: "blockNumber",
      size: BLOCKNUMBER_BYTES,
      type: "NumberLike",
      description: `
Block number of the transaction.
`,
    },
    {
      key: "inUtxo",
      size: UTXO_BYTES,
      type: "NumberLike",
      description: `
Index of the source address on UTXO chains. Always 0 on non-UTXO chains.
`,
    },
    {
      key: "utxo",
      size: UTXO_BYTES,
      type: "NumberLike",
      description: `
Index of the receiving address on UTXO chains. Always 0 on non-UTXO chains.
`,
    },
  ],
  dataHashDefinition: [
    {
      key: "blockNumber",
      type: "uint64",
      description: `
Number of the transaction block on the underlying chain.
`,
    },
    {
      key: "blockTimestamp",
      type: "uint64",
      description: `
Timestamp of the transaction block on the underlying chain.
`,
    },
    {
      key: "transactionHash",
      type: "bytes32",
      description: `
Hash of the transaction on the underlying chain.
`,
    },
    {
      key: "inUtxo",
      type: "uint8",
      description: `
Index of the transaction input indicating source address on UTXO chains, 0 on non-UTXO chains.
`,
    },
    {
      key: "utxo",
      type: "uint8",
      description: `
Output index for a transaction with multiple outputs on UTXO chains, 0 on non-UTXO chains.
The same as in the 'utxo' parameter from the request.
`,
    },
    {
      key: "sourceAddressHash",
      type: "bytes32",
      description: `
Standardized address hash of the source address viewed as a string
(the one indicated by the 'inUtxo' parameter for UTXO blockchains).
`,
    },
    {
      key: "intendedSourceAddressHash",
      type: "bytes32",
      description: `
Standardized address hash of the intended source address viewed as a string
(the one indicated by the 'inUtxo' parameter for UTXO blockchains).
`,
    },
    {
      key: "receivingAddressHash",
      type: "bytes32",
      description: `
Standardized address hash of the receiving address as a string
(the one indicated by the 'utxo' parameter for UTXO blockchains).
`,
    },
    {
      key: "intendedReceivingAddressHash",
      type: "bytes32",
      description: `
Standardized address hash of the intended receiving address as a string
(the one indicated by the 'utxo' parameter for UTXO blockchains).
`,
    },
    {
      key: "spentAmount",
      type: "int256",
      description: `
The amount that went out of the source address, in the smallest underlying units.
In non-UTXO chains it includes both payment value and fee (gas).
Calculation for UTXO chains depends on the existence of standardized payment reference.
If it exists, it is calculated as 'outgoing_amount - returned_amount' and can be negative.
If the standardized payment reference does not exist, then it is just the spent amount
on the input indicated by 'inUtxo'.
`,
    },
    {
      key: "intendedSpentAmount",
      type: "int256",
      description: `
The amount that was intended to go out of the source address, in the smallest underlying units.
If the transaction status is successful the value matches 'spentAmount'.
If the transaction status is not successful, the value is the amount that was intended
to be spent by the source address.
`,
    },
    {
      key: "receivedAmount",
      type: "int256",
      description: `
The amount received to the receiving address, in smallest underlying units.
Can be negative in UTXO chains.
`,
    },
    {
      key: "intendedReceivedAmount",
      type: "int256",
      description: `
The intended amount to be received by the receiving address, in smallest underlying units.
For transactions that are successful, this is the same as 'receivedAmount'.
If the transaction status is not successful, the value is the amount that was intended
to be received by the receiving address.
`,
    },
    {
      key: "paymentReference",
      type: "bytes32",
      description: `
Standardized payment reference, if it exists, 0 otherwise.
`,
    },
    {
      key: "oneToOne",
      type: "bool",
      description: `
'true' if the transaction has exactly one source address and
exactly one receiving address (different from source).
`,
    },
    {
      key: "status",
      type: "uint8",
      description: `
Transaction success status, can have 3 values:
  - 0 - Success
  - 1 - Failure due to sender (this is the default failure)
  - 2 - Failure due to receiver (bad destination address)
`,
    },
  ],
};
