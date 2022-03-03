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
         type: "AttestationType",
         description: 
`
Attestation type id for this request, must be 3.
`
      },
      {
         key: "chainId",
         size: CHAIN_ID_BYTES,
         type: "ChainType",
         description: 
`
The ID of the underlying chain, e.g. 0 for BTC, 3 for XRP, etc. (see the documentation for supported chain types).
`
      },
      {
         key: "blockNumber",
         size: BLOCKNUMBER_BYTES,
         type: "NumberLike",
         description: 
`
Number of the block to prove the existence of.
`
      },
      {
         key: "dataAvailabilityProof",
         size: DATA_AVAILABILITY_BYTES,
         type: "BytesLike",
         description: 
`
Hash of the block to prove the existence of.
`
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
