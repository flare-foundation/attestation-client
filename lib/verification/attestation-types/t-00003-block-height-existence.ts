import { ChainType } from "flare-mcc";
import {
   AttestationTypeScheme, ATT_BYTES,
   BLOCKNUMBER_BYTES,
   CHAIN_ID_BYTES,
   DATA_AVAILABILITY_BYTES
} from "./attestation-types";

export const TDEF: AttestationTypeScheme = {
   id: 3,
   supportedSources: [ChainType.XRP, ChainType.BTC, ChainType.LTC, ChainType.DOGE, ChainType.ALGO],
   name: "BlockHeightExists",
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
         key: "blockNumber",
         size: BLOCKNUMBER_BYTES,
         type: "NumberLike"
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
      //    type: "uint16"
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
Number of the block that was proved to exist.
`
      },
      {
         key: "blockTimestamp",
         type: "uint64",
         description:
`
Timestamp of the block that was proved to exist.
`
      },
   ]
}
