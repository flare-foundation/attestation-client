import { MccClient, PaymentSummary, prefix0x, toBN, unPrefix0x } from "@flarenetwork/mcc";
import Web3 from "web3";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { logException } from "../../utils/logger";
import { VerificationStatus } from "../attestation-types/attestation-types";
import { numberLikeToNumber } from "../attestation-types/attestation-types-helpers";
import { DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHPayment, DHReferencedPaymentNonexistence } from "../generated/attestation-hash-types";
import {
  ARBalanceDecreasingTransaction,
  ARConfirmedBlockHeightExists,
  ARPayment,
  ARReferencedPaymentNonexistence,
} from "../generated/attestation-request-types";
import {
  MccTransactionType,
  VerificationResponse,
  verifyWorkflowForBlock,
  verifyWorkflowForReferencedTransactions,
  verifyWorkflowForTransaction,
} from "./verification-utils";

//////////////////////////////////////////////////
// Verification functions
/////////////////////////////////////////////////

/**
 * `Payment` attestation type verification function performing synchronized indexer queries
 * @param TransactionClass
 * @param request attestation request
 * @param roundId voting round id
 * @param numberOfConfirmations required number of confirmation
 * @param recheck first query if `false` and second (final) query if `true`
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @param client MCC client for the relevant blockchain
 * @returns Verification response: object containing status and attestation response
 * @category Verifiers
 */
export async function verifyPayment(
  TransactionClass: new (...args: any[]) => MccTransactionType,
  request: ARPayment,
  roundId: number,
  numberOfConfirmations: number,
  recheck: boolean,
  iqm: IndexedQueryManager,
  client?: MccClient
): Promise<VerificationResponse<DHPayment>> {
  const confirmedTransactionResult = await iqm.getConfirmedTransaction({
    txId: unPrefix0x(request.id),
    numberOfConfirmations,
    upperBoundProof: request.upperBoundProof,
    roundId: roundId,
    type: recheck ? "RECHECK" : "FIRST_CHECK",
  });

  const status = verifyWorkflowForTransaction(confirmedTransactionResult);
  if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbTransaction = confirmedTransactionResult.transaction;

  let parsedData: any;
  try {
    parsedData = JSON.parse(confirmedTransactionResult.transaction.response);
  } catch (error) {
    logException(error, `verifyPayment '${request.id}' JSON parse '${confirmedTransactionResult.transaction.response}'`);
    throw error;
  }

  const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

  const inUtxoNumber = toBN(request.inUtxo).toNumber();
  const utxoNumber = toBN(request.utxo).toNumber();

  let paymentSummary: PaymentSummary;
  try {
    paymentSummary = await fullTxData.paymentSummary(client, inUtxoNumber, utxoNumber);
  } catch (e: any) {
    // TODO: return status according to exception
    return { status: VerificationStatus.PAYMENT_SUMMARY_ERROR };
  }

  if (!paymentSummary.isNativePayment) {
    return { status: VerificationStatus.NOT_PAYMENT };
  }

  const response = {
    stateConnectorRound: roundId,
    blockNumber: toBN(dbTransaction.blockNumber),
    blockTimestamp: toBN(dbTransaction.timestamp),
    transactionHash: prefix0x(dbTransaction.transactionId),
    inUtxo: toBN(request.inUtxo),
    utxo: toBN(request.utxo),
    sourceAddressHash: paymentSummary.sourceAddress ? Web3.utils.soliditySha3(paymentSummary.sourceAddress) : Web3.utils.leftPad("0x", 64),
    receivingAddressHash: paymentSummary.receivingAddress ? Web3.utils.soliditySha3(paymentSummary.receivingAddress) : Web3.utils.leftPad("0x", 64),
    paymentReference: paymentSummary.paymentReference || Web3.utils.leftPad("0x", 64),
    spentAmount: paymentSummary.spentAmount || toBN(0),
    receivedAmount: paymentSummary.receivedAmount || toBN(0),
    oneToOne: !!paymentSummary.oneToOne,
    status: toBN(fullTxData.successStatus),
  } as DHPayment;

  return {
    status: VerificationStatus.OK,
    response,
  };
}

/**
 * `BalanceDecreasingTransaction` attestation type verification function performing synchronized indexer queries
 * @param TransactionClass
 * @param request attestation request
 * @param roundId voting round id
 * @param numberOfConfirmations required number of confirmation
 * @param recheck first query if `false` and second (final) query if `true`
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @param client MCC client for the relevant blockchain
 * @returns Verification response, status and attestation response
 * @category Verifiers
 */
export async function verifyBalanceDecreasingTransaction(
  TransactionClass: new (...args: any[]) => MccTransactionType,
  request: ARBalanceDecreasingTransaction,
  roundId: number,
  numberOfConfirmations: number,
  recheck: boolean,
  iqm: IndexedQueryManager,
  client?: MccClient
): Promise<VerificationResponse<DHBalanceDecreasingTransaction>> {
  const confirmedTransactionResult = await iqm.getConfirmedTransaction({
    txId: unPrefix0x(request.id),
    numberOfConfirmations,
    upperBoundProof: request.upperBoundProof,
    roundId: roundId,
    type: recheck ? "RECHECK" : "FIRST_CHECK",
  });

  const status = verifyWorkflowForTransaction(confirmedTransactionResult);
  if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbTransaction = confirmedTransactionResult.transaction;
  const parsedData = JSON.parse(confirmedTransactionResult.transaction.response);
  const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

  const inUtxoNumber = toBN(request.inUtxo).toNumber();

  let paymentSummary: PaymentSummary;
  try {
    paymentSummary = await fullTxData.paymentSummary(client, inUtxoNumber);
  } catch (e: any) {
    // TODO: return status according to exception
    return { status: VerificationStatus.PAYMENT_SUMMARY_ERROR };
  }

  const response = {
    stateConnectorRound: roundId,
    blockNumber: toBN(dbTransaction.blockNumber),
    blockTimestamp: toBN(dbTransaction.timestamp),
    transactionHash: prefix0x(dbTransaction.transactionId),
    inUtxo: request.inUtxo,
    sourceAddressHash: paymentSummary.sourceAddress ? Web3.utils.soliditySha3(paymentSummary.sourceAddress) : Web3.utils.leftPad("0x", 64),
    spentAmount: paymentSummary.spentAmount || toBN(0),
    paymentReference: paymentSummary.paymentReference || Web3.utils.leftPad("0x", 64),
  } as DHBalanceDecreasingTransaction;

  return {
    status: VerificationStatus.OK,
    response,
  };
}

/**
 * `ConfirmedBlockHeightExists` attestation type verification function performing synchronized indexer queries
 * @param request attestation request
 * @param roundId voting round id
 * @param numberOfConfirmations required number of confirmation
 * @param recheck first query if `false` and second (final) query if `true`
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @returns Verification response, status and attestation response
 */
export async function verifyConfirmedBlockHeightExists(
  request: ARConfirmedBlockHeightExists,
  roundId: number,
  numberOfConfirmations: number,
  recheck: boolean,
  iqm: IndexedQueryManager
): Promise<VerificationResponse<DHConfirmedBlockHeightExists>> {
  const confirmedBlockQueryResult = await iqm.getConfirmedBlock({
    upperBoundProof: request.upperBoundProof,
    numberOfConfirmations,
    roundId,
    type: recheck ? "RECHECK" : "FIRST_CHECK",
    returnQueryBoundaryBlocks: true,
  });

  const status = verifyWorkflowForBlock(confirmedBlockQueryResult);
  if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbBlock = confirmedBlockQueryResult.block;

  const averageBlockProductionTimeMs = toBN(
    Math.floor(
      ((confirmedBlockQueryResult.upperBoundaryBlock.timestamp - confirmedBlockQueryResult.lowerBoundaryBlock.timestamp) * 1000) /
        (confirmedBlockQueryResult.upperBoundaryBlock.blockNumber - confirmedBlockQueryResult.lowerBoundaryBlock.blockNumber)
    )
  );

  const startTimestamp = iqm.settings.windowStartTime(roundId);
  const lowerQueryWindowBlock = await iqm.getFirstConfirmedBlockAfterTime(startTimestamp);

  const response = {
    stateConnectorRound: roundId,
    blockNumber: toBN(dbBlock.blockNumber),
    blockTimestamp: toBN(dbBlock.timestamp),
    numberOfConfirmations: toBN(numberOfConfirmations),
    averageBlockProductionTimeMs,
    lowestQueryWindowBlockNumber: toBN(lowerQueryWindowBlock.blockNumber),
    lowestQueryWindowBlockTimestamp: toBN(lowerQueryWindowBlock.timestamp),
  } as DHConfirmedBlockHeightExists;

  return {
    status: VerificationStatus.OK,
    response,
  };
}

/**
 * `ReferencedPaymentNonExistence` attestation type verification function performing synchronized indexer queries
 * @param TransactionClass
 * @param request attestation request
 * @param roundId voting round id
 * @param numberOfConfirmations required number of confirmation
 * @param recheck first query if `false` and second (final) query if `true`
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @param client MCC client for the relevant blockchain
 * @returns Verification response, status and attestation response
 */
export async function verifyReferencedPaymentNonExistence(
  TransactionClass: new (...args: any[]) => MccTransactionType,
  request: ARReferencedPaymentNonexistence,
  roundId: number,
  numberOfConfirmations: number,
  recheck: boolean,
  iqm: IndexedQueryManager
): Promise<VerificationResponse<DHReferencedPaymentNonexistence>> {
  // TODO: check if anything needs to be done with: startBlock >= overflowBlock
  const referencedTransactionsResponse = await iqm.getReferencedTransactions({
    deadlineBlockNumber: numberLikeToNumber(request.deadlineBlockNumber),
    deadlineBlockTimestamp: numberLikeToNumber(request.deadlineTimestamp),
    numberOfConfirmations,
    paymentReference: request.paymentReference,
    upperBoundProof: request.upperBoundProof,
    roundId,
    type: recheck ? "RECHECK" : "FIRST_CHECK",
  });

  const status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
  if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  // From here on these exist, dbTransactions can be an empty list.
  const dbTransactions = referencedTransactionsResponse.transactions;
  const firstOverflowBlock = referencedTransactionsResponse.firstOverflowBlock;
  const lowerBoundaryBlock = referencedTransactionsResponse.lowerBoundaryBlock;

  // Check transactions for a matching
  for (const dbTransaction of dbTransactions) {
    const parsedData = JSON.parse(dbTransaction.response);
    const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

    // In account based case this loop goes through only once.
    for (let outUtxo = 0; outUtxo < fullTxData.receivingAddresses.length; outUtxo++) {
      const address = fullTxData.receivingAddresses[outUtxo];
      const destinationAddressHash = Web3.utils.soliditySha3(address);
      if (destinationAddressHash === request.destinationAddressHash) {
        try {
          const paymentSummary = await fullTxData.paymentSummary(undefined, undefined, outUtxo);

          if (paymentSummary.receivedAmount.eq(toBN(request.amount))) {
            return { status: VerificationStatus.REFERENCED_TRANSACTION_EXISTS };
          }
        } catch (e) {
          return { status: VerificationStatus.PAYMENT_SUMMARY_ERROR };
        }
        // no match on that address, proceed to the next transaction
        break;
      }
    }
  }

  const response = {
    stateConnectorRound: roundId,
    deadlineBlockNumber: request.deadlineBlockNumber,
    deadlineTimestamp: request.deadlineTimestamp,
    destinationAddressHash: Web3.utils.soliditySha3(request.destinationAddressHash),
    paymentReference: prefix0x(request.paymentReference),
    amount: request.amount,
    lowerBoundaryBlockNumber: toBN(lowerBoundaryBlock.blockNumber),
    lowerBoundaryBlockTimestamp: toBN(lowerBoundaryBlock.timestamp),
    firstOverflowBlockNumber: toBN(firstOverflowBlock.blockNumber),
    firstOverflowBlockTimestamp: toBN(firstOverflowBlock.timestamp),
  } as DHReferencedPaymentNonexistence;

  return {
    status: VerificationStatus.OK,
    response,
  };
}
