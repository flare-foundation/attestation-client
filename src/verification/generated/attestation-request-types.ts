//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ByteSequenceLike, NumberLike } from "../attestation-types/attestation-types";
import { AttestationType } from "./attestation-types-enum";
import { SourceId } from "../sources/sources";

export interface ARPayment {
  // Attestation type id for this request, see 'AttestationType' enum.
  attestationType: AttestationType;

  // The ID of the underlying chain, see 'SourceId' enum.
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'flare'. Used to verify consistency of attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  messageIntegrityCode: ByteSequenceLike;

  // Transaction hash to search for.
  id: ByteSequenceLike;

  // Index of the source address on UTXO chains. Always 0 on non-UTXO chains.
  inUtxo: NumberLike;

  // Index of the receiving address on UTXO chains. Always 0 on non-UTXO chains.
  utxo: NumberLike;
}

export interface ARBalanceDecreasingTransaction {
  // Attestation type id for this request, see 'AttestationType' enum.
  attestationType: AttestationType;

  // The ID of the underlying chain, see 'SourceId' enum.
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'flare'. Used to verify consistency of attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  messageIntegrityCode: ByteSequenceLike;

  // Transaction hash to search for.
  id: ByteSequenceLike;

  // Index of the source address on UTXO chains.
  inUtxo: NumberLike;
}

export interface ARConfirmedBlockHeightExists {
  // Attestation type id for this request, see AttestationType enum.
  attestationType: AttestationType;

  // The ID of the underlying chain, see SourceId enum.
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'flare'. Used to verify consistency of attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  messageIntegrityCode: ByteSequenceLike;

  // Block number of the to be proved to be confirmed.
  blockNumber: NumberLike;

  // Period in seconds considered for sampling block production. The block with number 'lowestQueryWindowBlockNumber' is defined as the last block with the timestamp strictly smaller than 'block.timestamp - productionSamplingPeriod'.
  queryWindow: NumberLike;
}

export interface ARReferencedPaymentNonexistence {
  // Attestation type id for this request, see 'AttestationType' enum.
  attestationType: AttestationType;

  // The ID of the underlying chain, see 'SourceId' enum.
  sourceId: SourceId;

  // The hash of the expected attestation response appended by string 'flare'. Used to verify consistency of attestation response against the anticipated result, thus preventing wrong (forms of) attestations.
  messageIntegrityCode: ByteSequenceLike;

  // Minimum number of the block for the query window. Equal to 'lowerBoundaryBlockNumber' in response.
  minimalBlockNumber: NumberLike;

  // Maximum number of the block where the transaction is searched for.
  deadlineBlockNumber: NumberLike;

  // Maximum timestamp of the block where the transaction is searched for. Search range is determined by the bigger of the last block with 'deadlineTimestamp'.
  deadlineTimestamp: NumberLike;

  // Hash of exact address to which the payment was done to.
  destinationAddressHash: ByteSequenceLike;

  // The exact amount to search for.
  amount: NumberLike;

  // The payment reference to search for.
  paymentReference: ByteSequenceLike;
}
export type ARType = ARPayment | ARBalanceDecreasingTransaction | ARConfirmedBlockHeightExists | ARReferencedPaymentNonexistence;
