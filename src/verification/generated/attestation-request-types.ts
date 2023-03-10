//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ApiProperty } from "@nestjs/swagger";
import { ByteSequenceLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";

export class ARPayment {
  // Attestation type id for this request, see 'AttestationType' enum.
  @ApiProperty({ enum: AttestationType })
  attestationType: AttestationType;

  // The ID of the underlying chain, see 'SourceId' enum.
  @ApiProperty({ enum: SourceId })
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  // Transaction hash to search for.
  @ApiProperty()
  id: ByteSequenceLike;

  // Index of the source address on UTXO chains. Always 0 on non-UTXO chains.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  inUtxo: NumberLike;

  // Index of the receiving address on UTXO chains. Always 0 on non-UTXO chains.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  utxo: NumberLike;
}

export class ARBalanceDecreasingTransaction {
  // Attestation type id for this request, see 'AttestationType' enum.
  @ApiProperty({ enum: AttestationType })
  attestationType: AttestationType;

  // The ID of the underlying chain, see 'SourceId' enum.
  @ApiProperty({ enum: SourceId })
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  // Transaction hash to search for.
  @ApiProperty()
  id: ByteSequenceLike;

  // Index of the source address on UTXO chains.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  inUtxo: NumberLike;
}

export class ARConfirmedBlockHeightExists {
  // Attestation type id for this request, see AttestationType enum.
  @ApiProperty({ enum: AttestationType })
  attestationType: AttestationType;

  // The ID of the underlying chain, see SourceId enum.
  @ApiProperty({ enum: SourceId })
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  // Block number to be proved to be confirmed.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  blockNumber: NumberLike;

  // Period in seconds considered for sampling block production. The block with number 'lowestQueryWindowBlockNumber' in the attestation response is defined as the last block with the timestamp strictly smaller than 'block.timestamp - queryWindow'.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  queryWindow: NumberLike;
}

export class ARReferencedPaymentNonexistence {
  // Attestation type id for this request, see 'AttestationType' enum.
  @ApiProperty({ enum: AttestationType })
  attestationType: AttestationType;

  // The ID of the underlying chain, see 'SourceId' enum.
  @ApiProperty({ enum: SourceId })
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'Flare'. Used to verify consistency of the attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  @ApiProperty()
  messageIntegrityCode: ByteSequenceLike;

  // Minimum number of the block for the query window. Equal to 'lowerBoundaryBlockNumber' in response.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  minimalBlockNumber: NumberLike;

  // Maximum number of the block where the transaction is searched for.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  deadlineBlockNumber: NumberLike;

  // Maximum timestamp of the block where the transaction is searched for. Search range is determined by the bigger of the 'deadlineBlockNumber' and the last block with 'deadlineTimestamp'.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  deadlineTimestamp: NumberLike;

  // Hash of exact address to which the payment was done to.
  @ApiProperty()
  destinationAddressHash: ByteSequenceLike;

  // The exact amount to search for.
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "number" }],
  })
  amount: NumberLike;

  // The payment reference to search for.
  @ApiProperty()
  paymentReference: ByteSequenceLike;
}
export type ARType = ARPayment | ARBalanceDecreasingTransaction | ARConfirmedBlockHeightExists | ARReferencedPaymentNonexistence;
export const ARTypeArray = [ARPayment, ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARReferencedPaymentNonexistence];
