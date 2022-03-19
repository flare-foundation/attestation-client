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
   name: "ConfirmedBlockHeightExists",
   request: [
      {
         key: "attestationType",
         size: ATT_BYTES,
         type: "AttestationType",
         description: 
`
Attestation type id for this request, see AttestationType enum.
`
      },
      {
         key: "chainId",
         size: CHAIN_ID_BYTES,
         type: "SourceId",
         description: 
`
The ID of the underlying chain, see ChainType enum.
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
         type: "ByteSequenceLike",
         description: 
`
Hash of the block to prove the existence of.
`
      },
   ],
   dataHashDefinition: [
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
