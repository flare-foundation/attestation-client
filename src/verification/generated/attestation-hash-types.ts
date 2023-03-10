//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import BN from "bn.js";

export class DHPayment {
  // Attestation type
  @ApiPropertyOptional()
  stateConnectorRound?: number;
  @ApiPropertyOptional()
  merkleProof?: string[];

  // Number of the transaction block on the underlying chain.
  @ApiProperty({ type: "string", description: "String representation of number" })
  blockNumber: BN;

  // Timestamp of the transaction block on the underlying chain.
  @ApiProperty({ type: "string", description: "String representation of number" })
  blockTimestamp: BN;

  // Hash of the transaction on the underlying chain.
  @ApiProperty()
  transactionHash: string;

  // Index of the transaction input indicating source address on UTXO chains, 0 on non-UTXO chains.
  @ApiProperty({ type: "string", description: "String representation of number" })
  inUtxo: BN;

  // Output index for a transaction with multiple outputs on UTXO chains, 0 on non-UTXO chains.
  // The same as in the 'utxo' parameter from the request.
  @ApiProperty({ type: "string", description: "String representation of number" })
  utxo: BN;

  // Hash of the source address viewed as a string (the one indicated by the 'inUtxo'
  // parameter for UTXO blockchains).
  @ApiProperty()
  sourceAddressHash: string;

  // Hash of the receiving address as a string (the one indicated by the 'utxo'
  // parameter for UTXO blockchains).
  @ApiProperty()
  receivingAddressHash: string;

  // The amount that went out of the source address, in the smallest underlying units.
  // In non-UTXO chains it includes both payment value and fee (gas).
  // Calculation for UTXO chains depends on the existence of standardized payment reference.
  // If it exists, it is calculated as 'outgoing_amount - returned_amount' and can be negative.
  // If the standardized payment reference does not exist, then it is just the spent amount
  // on the input indicated by 'inUtxo'.
  @ApiProperty({ type: "string", description: "String representation of number" })
  spentAmount: BN;

  // The amount received to the receiving address, in smallest underlying units. Can be negative in UTXO chains.
  @ApiProperty({ type: "string", description: "String representation of number" })
  receivedAmount: BN;

  // Standardized payment reference, if it exists, 0 otherwise.
  @ApiProperty()
  paymentReference: string;

  // 'true' if the transaction has exactly one source address and
  // exactly one receiving address (different from source).
  @ApiProperty()
  oneToOne: boolean;

  // Transaction success status, can have 3 values:
  //   - 0 - Success
  //   - 1 - Failure due to sender (this is the default failure)
  //   - 2 - Failure due to receiver (bad destination address)
  @ApiProperty({ type: "string", description: "String representation of number" })
  status: BN;
}

export class DHBalanceDecreasingTransaction {
  // Attestation type
  @ApiPropertyOptional()
  stateConnectorRound?: number;
  @ApiPropertyOptional()
  merkleProof?: string[];

  // Number of the transaction block on the underlying chain.
  @ApiProperty({ type: "string", description: "String representation of number" })
  blockNumber: BN;

  // Timestamp of the transaction block on the underlying chain.
  @ApiProperty({ type: "string", description: "String representation of number" })
  blockTimestamp: BN;

  // Hash of the transaction on the underlying chain.
  @ApiProperty()
  transactionHash: string;

  // Index of the transaction input indicating source address on UTXO chains, 0 on non-UTXO chains.
  @ApiProperty({ type: "string", description: "String representation of number" })
  inUtxo: BN;

  // Hash of the source address as a string. For UTXO transactions with multiple input addresses
  // this is the address that is on the input indicated by 'inUtxo' parameter.
  @ApiProperty()
  sourceAddressHash: string;

  // The amount that went out of the source address, in the smallest underlying units.
  // In non-UTXO chains it includes both payment value and fee (gas).
  // Calculation for UTXO chains depends on the existence of standardized payment reference.
  // If it exists, it is calculated as 'outgoing_amount - returned_amount' and can be negative.
  // If the standardized payment reference does not exist, then it is just the spent amount
  // on the input indicated by 'inUtxo'.
  @ApiProperty({ type: "string", description: "String representation of number" })
  spentAmount: BN;

  // Standardized payment reference, if it exists, 0 otherwise.
  @ApiProperty()
  paymentReference: string;
}

export class DHConfirmedBlockHeightExists {
  // Attestation type
  @ApiPropertyOptional()
  stateConnectorRound?: number;
  @ApiPropertyOptional()
  merkleProof?: string[];

  // Number of the highest confirmed block that was proved to exist.
  @ApiProperty({ type: "string", description: "String representation of number" })
  blockNumber: BN;

  // Timestamp of the confirmed block that was proved to exist.
  @ApiProperty({ type: "string", description: "String representation of number" })
  blockTimestamp: BN;

  // Number of confirmations for the blockchain.
  @ApiProperty({ type: "string", description: "String representation of number" })
  numberOfConfirmations: BN;

  // Lowest query window block number.
  @ApiProperty({ type: "string", description: "String representation of number" })
  lowestQueryWindowBlockNumber: BN;

  // Lowest query window block timestamp.
  @ApiProperty({ type: "string", description: "String representation of number" })
  lowestQueryWindowBlockTimestamp: BN;
}

export class DHReferencedPaymentNonexistence {
  // Attestation type
  @ApiPropertyOptional()
  stateConnectorRound?: number;
  @ApiPropertyOptional()
  merkleProof?: string[];

  // Deadline block number specified in the attestation request.
  @ApiProperty({ type: "string", description: "String representation of number" })
  deadlineBlockNumber: BN;

  // Deadline timestamp specified in the attestation request.
  @ApiProperty({ type: "string", description: "String representation of number" })
  deadlineTimestamp: BN;

  // Hash of the destination address searched for.
  @ApiProperty()
  destinationAddressHash: string;

  // The payment reference searched for.
  @ApiProperty()
  paymentReference: string;

  // The amount searched for.
  @ApiProperty({ type: "string", description: "String representation of number" })
  amount: BN;

  // The first confirmed block that gets checked. It is exactly 'minimalBlockNumber' from the request.
  @ApiProperty({ type: "string", description: "String representation of number" })
  lowerBoundaryBlockNumber: BN;

  // Timestamp of the 'lowerBoundaryBlockNumber'.
  @ApiProperty({ type: "string", description: "String representation of number" })
  lowerBoundaryBlockTimestamp: BN;

  // The first (lowest) confirmed block with 'timestamp > deadlineTimestamp'
  // and 'blockNumber  > deadlineBlockNumber'.
  @ApiProperty({ type: "string", description: "String representation of number" })
  firstOverflowBlockNumber: BN;

  // Timestamp of the firstOverflowBlock.
  @ApiProperty({ type: "string", description: "String representation of number" })
  firstOverflowBlockTimestamp: BN;
}
export type DHType = DHPayment | DHBalanceDecreasingTransaction | DHConfirmedBlockHeightExists | DHReferencedPaymentNonexistence;
export const DHTypeArray = [DHPayment, DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHReferencedPaymentNonexistence];
