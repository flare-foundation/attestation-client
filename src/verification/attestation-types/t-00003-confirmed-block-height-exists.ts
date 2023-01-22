import { SourceId } from "../sources/sources";
import { AttestationTypeScheme, ATT_BYTES, BLOCKNUMBER_BYTES, MIC_BYTES, SOURCE_ID_BYTES, TIME_DURATION_BYTES } from "./attestation-types";

export const TDEF: AttestationTypeScheme = {
  id: 3,
  supportedSources: [SourceId.XRP, SourceId.BTC, SourceId.LTC, SourceId.DOGE, SourceId.ALGO],
  name: "ConfirmedBlockHeightExists",
  request: [
    {
      key: "attestationType",
      size: ATT_BYTES,
      type: "AttestationType",
      description: `
Attestation type id for this request, see AttestationType enum.
`,
    },
    {
      key: "sourceId",
      size: SOURCE_ID_BYTES,
      type: "SourceId",
      description: `
The ID of the underlying chain, see SourceId enum.
`,
    },
    {
      key: "messageIntegrityCode",
      size: MIC_BYTES,
      type: "ByteSequenceLike",
      description: `
The hash of the expected attestation response appended by string 'flare'. Used to verify consistency of attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
`,
    },
    {
      key: "blockNumber",
      size: BLOCKNUMBER_BYTES,
      type: "NumberLike",
      description: `
Block number of the to be proved to be confirmed.
`,
    },
    {
      key: "queryWindow",
      size: TIME_DURATION_BYTES,
      type: "NumberLike",
      description: `
Period in seconds considered for sampling block production. The block with number 'lowestQueryWindowBlockNumber' is defined as the last block with the timestamp strictly smaller than 'block.timestamp - productionSamplingPeriod'.
`,
    },

  ],
  dataHashDefinition: [
    {
      key: "blockNumber",
      type: "uint64",
      description: `
Number of the highest confirmed block that was proved to exist.
`,
    },
    {
      key: "blockTimestamp",
      type: "uint64",
      description: `
Timestamp of the confirmed block that was proved to exist.
`,
    },
    {
      key: "numberOfConfirmations",
      type: "uint8",
      description: `
Number of confirmations for the blockchain.
`,
    },
    {
      key: "lowestQueryWindowBlockNumber",
      type: "uint64",
      description: `
Lowest query window block number.
`,
    },
    {
      key: "lowestQueryWindowBlockTimestamp",
      type: "uint64",
      description: `
Lowest query window block timestamp.
`,
    },
  ],
};
