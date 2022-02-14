import { ChainType } from "flare-mcc";
import {
   AMOUNT_BYTES,
   AttestationTypeScheme, ATT_BYTES,
   BLOCKNUMBER_BYTES,
   CHAIN_ID_BYTES,
   DATA_AVAILABILITY_BYTES,
   PAYMENT_REFERENCE_BYTES,
   TIMESTAMP_BYTES
} from "./attestation-types";

export const TDEF: AttestationTypeScheme = {
   id: 4,
   supportedSources: [ChainType.XRP, ChainType.BTC, ChainType.LTC, ChainType.DOGE, ChainType.ALGO],
   name: "ReferencedPaymentNonExistence",
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
         key: "endTimestamp",
         size: TIMESTAMP_BYTES,
         type: "NumberLike"
      },
      {
         key: "endBlock",
         size: BLOCKNUMBER_BYTES,
         type: "NumberLike"
      },
      {
         key: "amount",
         size: AMOUNT_BYTES,
         type: "NumberLike"
      },
      {
         key: "paymentReference",
         size: PAYMENT_REFERENCE_BYTES,
         type: "NumberLike"
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
         key: "endTimestamp",
         type: "uint64"
      },
      {
         key: "endBlock",
         type: "uint64"
      },
      {
         key: "paymentReference",
         type: "uint128"
      },
      {
         key: "amount",
         type: "uint128"
      },
      {
         key: "firstCheckedBlockTimestamp",
         type: "uint64"
      },
      {
         key: "firstCheckedBlock",
         type: "uint64"
      },
      {
         key: "firstOverflowBlockTimestamp",
         type: "uint64"
      },
      {
         key: "firstOverflowBlock",
         type: "uint64"
      },
   ]
}
