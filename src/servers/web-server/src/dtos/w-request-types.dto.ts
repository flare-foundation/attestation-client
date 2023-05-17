//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ApiProperty } from "@nestjs/swagger";
import { ByteSequenceLike, NumberLike } from "../../../../../src/verification/generated/../attestation-types/attestation-types";
import { AttestationType } from "../../../../../src/verification/generated/./attestation-types-enum";
import { SourceId } from "../../../../../src/verification/generated/../sources/sources";

export interface ARBase {
  /**
   * Attestation type id for this request, see 'AttestationType' enum.
   */
  attestationType: AttestationType;

  /**
   * The ID of the underlying chain, see 'SourceId' enum.
   */
  sourceId: SourceId;

  /**
   * The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
   */
  messageIntegrityCode: ByteSequenceLike;
}

export class ARPayment implements ARBase {
  /**
   * Attestation type id for this request, see 'AttestationType' enum.
   */
  @ApiProperty({
    enum: AttestationType,
    description: `
Attestation type id for this request, see 'AttestationType' enum.
`,
  })
  attestationType: AttestationType;

  /**
   * The ID of the underlying chain, see 'SourceId' enum.
   */
  @ApiProperty({
    enum: SourceId,
    description: `
The ID of the underlying chain, see 'SourceId' enum.
`,
  })
  sourceId: SourceId;

  /**
   * The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
   */
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  /**
   * Transaction hash to search for.
   */
  @ApiProperty()
  id: ByteSequenceLike;

  /**
   * Block number of the transaction.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Block number of the transaction.
`,
  })
  blockNumber: NumberLike;

  /**
   * Index of the source address on UTXO chains. Always 0 on non-UTXO chains.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Index of the source address on UTXO chains. Always 0 on non-UTXO chains.
`,
  })
  inUtxo: NumberLike;

  /**
   * Index of the receiving address on UTXO chains. Always 0 on non-UTXO chains.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Index of the receiving address on UTXO chains. Always 0 on non-UTXO chains.
`,
  })
  utxo: NumberLike;
}

export class ARBalanceDecreasingTransaction implements ARBase {
  /**
   * Attestation type id for this request, see 'AttestationType' enum.
   */
  @ApiProperty({
    enum: AttestationType,
    description: `
Attestation type id for this request, see 'AttestationType' enum.
`,
  })
  attestationType: AttestationType;

  /**
   * The ID of the underlying chain, see 'SourceId' enum.
   */
  @ApiProperty({
    enum: SourceId,
    description: `
The ID of the underlying chain, see 'SourceId' enum.
`,
  })
  sourceId: SourceId;

  /**
   * The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
   */
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  /**
   * Transaction hash to search for.
   */
  @ApiProperty()
  id: ByteSequenceLike;

  /**
   * Block number of the transaction.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Block number of the transaction.
`,
  })
  blockNumber: NumberLike;

  /**
   * Either standardized hash of a source address or UTXO vin index in hex format.
   */
  @ApiProperty()
  sourceAddressIndicator: ByteSequenceLike;
}

export class ARConfirmedBlockHeightExists implements ARBase {
  /**
   * Attestation type id for this request, see 'AttestationType' enum.
   */
  @ApiProperty({
    enum: AttestationType,
    description: `
Attestation type id for this request, see 'AttestationType' enum.
`,
  })
  attestationType: AttestationType;

  /**
   * The ID of the underlying chain, see 'SourceId' enum.
   */
  @ApiProperty({
    enum: SourceId,
    description: `
The ID of the underlying chain, see 'SourceId' enum.
`,
  })
  sourceId: SourceId;

  /**
   * The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
   */
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  /**
   * Block number to be proved to be confirmed.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Block number to be proved to be confirmed.
`,
  })
  blockNumber: NumberLike;

  /**
   * Period in seconds considered for sampling block production. The block with number 'lowestQueryWindowBlockNumber' in the attestation response is defined as the last block with the timestamp strictly smaller than 'block.timestamp - queryWindow'.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Period in seconds considered for sampling block production. The block with number 'lowestQueryWindowBlockNumber' in the attestation response is defined as the last block with the timestamp strictly smaller than 'block.timestamp - queryWindow'.
`,
  })
  queryWindow: NumberLike;
}

export class ARReferencedPaymentNonexistence implements ARBase {
  /**
   * Attestation type id for this request, see 'AttestationType' enum.
   */
  @ApiProperty({
    enum: AttestationType,
    description: `
Attestation type id for this request, see 'AttestationType' enum.
`,
  })
  attestationType: AttestationType;

  /**
   * The ID of the underlying chain, see 'SourceId' enum.
   */
  @ApiProperty({
    enum: SourceId,
    description: `
The ID of the underlying chain, see 'SourceId' enum.
`,
  })
  sourceId: SourceId;

  /**
   * The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
   */
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  /**
   * Minimum number of the block for the query window. Equal to 'lowerBoundaryBlockNumber' in response.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Minimum number of the block for the query window. Equal to 'lowerBoundaryBlockNumber' in response.
`,
  })
  minimalBlockNumber: NumberLike;

  /**
   * Maximum number of the block where the transaction is searched for.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Maximum number of the block where the transaction is searched for.
`,
  })
  deadlineBlockNumber: NumberLike;

  /**
   * Maximum timestamp of the block where the transaction is searched for. Search range is determined by the bigger of the 'deadlineBlockNumber' and the last block with 'deadlineTimestamp'.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
Maximum timestamp of the block where the transaction is searched for. Search range is determined by the bigger of the 'deadlineBlockNumber' and the last block with 'deadlineTimestamp'.
`,
  })
  deadlineTimestamp: NumberLike;

  /**
   * Standardized address hash of the exact address to which the payment was done to.
   */
  @ApiProperty()
  destinationAddressHash: ByteSequenceLike;

  /**
   * The minimal amount to search for.
   */
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
    description: `
The minimal amount to search for.
`,
  })
  amount: NumberLike;

  /**
   * The payment reference to search for.
   */
  @ApiProperty()
  paymentReference: ByteSequenceLike;
}
export type ARType = ARPayment | ARBalanceDecreasingTransaction | ARConfirmedBlockHeightExists | ARReferencedPaymentNonexistence;
export const ARTypeArray = [ARPayment, ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARReferencedPaymentNonexistence];
