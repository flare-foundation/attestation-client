import { MccClient, PaymentSummary, prefix0x, toBN, unPrefix0x, ZERO_BYTES_32 } from "@flarenetwork/mcc";
import Web3 from "web3";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { logException } from "../../utils/logging/logger";
import { ByteSequenceLike, NumberLike, VerificationStatus } from "../attestation-types/attestation-types";
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
  verifyWorkflowForBlockAvailability,
  verifyWorkflowForReferencedTransactions,
  verifyWorkflowForTransaction,
} from "./verification-utils";

//////////////////////////////////////////////////
// Verification functions
/////////////////////////////////////////////////

/**
 * Auxillary function for assembling attestation response for 'Payment' attestation type.
 * @param dbTransaction
 * @param TransactionClass
 * @param inUtxo 
 * @param utxo
 * @param client
 * @returns
 */
export async function responsePayment(
  dbTransaction: DBTransactionBase,
  TransactionClass: new (...args: any[]) => MccTransactionType,
  inUtxo: NumberLike,
  utxo: NumberLike,
  client?: MccClient
) {
  let parsedData: any;
  try {
    parsedData = JSON.parse(dbTransaction.response);
  } catch (error) {
    logException(error, `responsePayment '${dbTransaction.id}' JSON parse '${dbTransaction.response}'`);
    return { status: VerificationStatus.SYSTEM_FAILURE };
  }

  const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

  const inUtxoNumber = toBN(inUtxo).toNumber();
  const utxoNumber = toBN(utxo).toNumber();

  let paymentSummary: PaymentSummary;
  try {
    paymentSummary = await fullTxData.paymentSummary(client, inUtxoNumber, utxoNumber);
  } catch (e: any) {
    return { status: VerificationStatus.PAYMENT_SUMMARY_ERROR };
  }

  if (!paymentSummary.isNativePayment) {
    return { status: VerificationStatus.NOT_PAYMENT };
  }

  const response = {
    blockNumber: toBN(dbTransaction.blockNumber),
    blockTimestamp: toBN(dbTransaction.timestamp),
    transactionHash: prefix0x(dbTransaction.transactionId),
    inUtxo: toBN(inUtxo),
    utxo: toBN(utxo),
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
 * `Payment` attestation type verification function performing synchronized indexer queries
 * @param TransactionClass
 * @param request attestation request
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @param client MCC client for the relevant blockchain
 * @returns Verification response: object containing status and attestation response
 * @category Verifiers
 */
export async function verifyPayment(
  TransactionClass: new (...args: any[]) => MccTransactionType,
  request: ARPayment,
  iqm: IndexedQueryManager,
  client?: MccClient
): Promise<VerificationResponse<DHPayment>> {
  // Check data availability
  const confirmedBlockQueryResult = await iqm.getConfirmedBlock({
    blockNumber: toBN(request.blockNumber).toNumber(),
  });

  let status = verifyWorkflowForBlockAvailability(confirmedBlockQueryResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  // Check for transaction
  const confirmedTransactionResult = await iqm.getConfirmedTransaction({
    txId: unPrefix0x(request.id),
  });

  status = verifyWorkflowForTransaction(confirmedTransactionResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  if (confirmedTransactionResult.transaction.blockNumber !== confirmedBlockQueryResult.block.blockNumber) {
    return { status: VerificationStatus.NON_EXISTENT_TRANSACTION };
  }

  const dbTransaction = confirmedTransactionResult.transaction;
  return await responsePayment(dbTransaction, TransactionClass, request.inUtxo, request.utxo, client);
}

/**
 * Auxillary function for assembling attestation response for 'BlanceDecreasingTransaction' attestation type.
 * @param dbTransaction
 * @param TransactionClass
 * @param sourceAddressIndicator
 * @param client
 * @returns
 */
export async function responseBalanceDecreasingTransaction(
  dbTransaction: DBTransactionBase,
  TransactionClass: new (...args: any[]) => MccTransactionType,
  sourceAddressIndicator: ByteSequenceLike,
  client?: MccClient
) {
  let parsedData: any;
  try {
    parsedData = JSON.parse(dbTransaction.response);
  } catch (error) {
    logException(error, `responseBalanceDecreasingTransaction '${dbTransaction.id}' JSON parse '${dbTransaction.response}'`);
    return { status: VerificationStatus.SYSTEM_FAILURE };
  }

  const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

  const inUtxoNumber = toBN(sourceAddressIndicator).toNumber();

  let paymentSummary: PaymentSummary;
  try {
    paymentSummary = await fullTxData.paymentSummary(client, inUtxoNumber);
  } catch (e: any) {
    return { status: VerificationStatus.PAYMENT_SUMMARY_ERROR };
  }

  const response = {
    blockNumber: toBN(dbTransaction.blockNumber),
    blockTimestamp: toBN(dbTransaction.timestamp),
    transactionHash: prefix0x(dbTransaction.transactionId),
    sourceAddressIndicator,
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
 * `BalanceDecreasingTransaction` attestation type verification function performing synchronized indexer queries
 * @param TransactionClass
 * @param request attestation request
 * @param requestOptions request options
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @param client MCC client for the relevant blockchain
 * @returns Verification response, status and attestation response
 * @category Verifiers
 */
export async function verifyBalanceDecreasingTransaction(
  TransactionClass: new (...args: any[]) => MccTransactionType,
  request: ARBalanceDecreasingTransaction,
  iqm: IndexedQueryManager,
  client?: MccClient
): Promise<VerificationResponse<DHBalanceDecreasingTransaction>> {
  // Check data availability
  const confirmedBlockQueryResult = await iqm.getConfirmedBlock({
    blockNumber: toBN(request.blockNumber).toNumber(),
  });

  let status = verifyWorkflowForBlockAvailability(confirmedBlockQueryResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  // Check for transaction
  const confirmedTransactionResult = await iqm.getConfirmedTransaction({
    txId: unPrefix0x(request.id),
  });

  status = verifyWorkflowForTransaction(confirmedTransactionResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  if (confirmedTransactionResult.transaction.blockNumber !== confirmedBlockQueryResult.block.blockNumber) {
    return {
      status: VerificationStatus.NON_EXISTENT_TRANSACTION,
    };
  }

  const dbTransaction = confirmedTransactionResult.transaction;
  return await responseBalanceDecreasingTransaction(dbTransaction, TransactionClass, request.sourceAddressIndicator, client);
}

/**
 * Auxillary function for assembling attestation response for 'ConfirmedBlockHeightExists' attestation type.
 * @param dbBlock
 * @param lowerQueryWindowBlock
 * @param numberOfConfirmations
 * @returns
 */
export async function responseConfirmedBlockHeightExists(dbBlock: DBBlockBase, lowerQueryWindowBlock: DBBlockBase, numberOfConfirmations: number) {
  const response = {
    blockNumber: toBN(dbBlock.blockNumber),
    blockTimestamp: toBN(dbBlock.timestamp),
    numberOfConfirmations: toBN(numberOfConfirmations),
    lowestQueryWindowBlockNumber: toBN(lowerQueryWindowBlock.blockNumber),
    lowestQueryWindowBlockTimestamp: toBN(lowerQueryWindowBlock.timestamp),
  } as DHConfirmedBlockHeightExists;

  return {
    status: VerificationStatus.OK,
    response,
  };
}

/**
 * `ConfirmedBlockHeightExists` attestation type verification function performing synchronized indexer queries
 * @param request attestation request
 * @param requestOptions request options
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @returns Verification response, status and attestation response
 */
export async function verifyConfirmedBlockHeightExists(
  request: ARConfirmedBlockHeightExists,
  iqm: IndexedQueryManager
): Promise<VerificationResponse<DHConfirmedBlockHeightExists>> {
  const confirmedBlockQueryResult = await iqm.getConfirmedBlock({
    blockNumber: toBN(request.blockNumber).toNumber(),
  });

  const status = verifyWorkflowForBlock(confirmedBlockQueryResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbBlock = confirmedBlockQueryResult.block;
  const lowerQueryWindowBlock = await iqm.getLastConfirmedBlockStrictlyBeforeTime(dbBlock.timestamp - toBN(request.queryWindow).toNumber());

  if (!lowerQueryWindowBlock) {
    return {
      status: VerificationStatus.DATA_AVAILABILITY_ISSUE,
    };
  }
  return await responseConfirmedBlockHeightExists(dbBlock, lowerQueryWindowBlock, iqm.settings.numberOfConfirmations());
}

/**
 * Auxillary function for assembling attestation response for 'ConfirmedBlockHeightExists' attestation type.
 * @param dbTransactions
 * @param TransactionClass
 * @param firstOverflowBlock
 * @param lowerBoundaryBlock
 * @param deadlineBlockNumber
 * @param deadlineTimestamp
 * @param destinationAddressHash
 * @param paymentReference
 * @param amount
 * @returns
 */
export async function responseReferencedPaymentNonExistence(
  dbTransactions: DBTransactionBase[],
  TransactionClass: new (...args: any[]) => MccTransactionType,
  firstOverflowBlock: DBBlockBase,
  lowerBoundaryBlock: DBBlockBase,
  deadlineBlockNumber: NumberLike,
  deadlineTimestamp: NumberLike,
  destinationAddressHash: string,
  paymentReference: string,
  amount: NumberLike
) {
  // Check transactions for a matching
  for (const dbTransaction of dbTransactions) {
    let fullTxData;
    try {
      const parsedData = JSON.parse(dbTransaction.response);
      fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);
    } catch (e) {
      return { status: VerificationStatus.SYSTEM_FAILURE };
    }

    // In account based case this loop goes through only once.
    for (let outUtxo = 0; outUtxo < fullTxData.receivingAddresses.length; outUtxo++) {
      const address = fullTxData.receivingAddresses[outUtxo];
      const destinationAddressHashTmp = Web3.utils.soliditySha3(address);
      if (destinationAddressHashTmp === destinationAddressHash) {
        try {
          const paymentSummary = await fullTxData.paymentSummary(undefined, undefined, outUtxo);

          if (paymentSummary.receivedAmount.eq(toBN(amount))) {
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
    deadlineBlockNumber: toBN(deadlineBlockNumber),
    deadlineTimestamp: toBN(deadlineTimestamp),
    destinationAddressHash: destinationAddressHash,
    paymentReference: prefix0x(paymentReference),
    amount: toBN(amount),
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

/**
 * `ReferencedPaymentNonExistence` attestation type verification function performing synchronized indexer queries
 * @param TransactionClass
 * @param request attestation request
 * @param requestOptions request options
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @returns Verification response, status and attestation response
 */
export async function verifyReferencedPaymentNonExistence(
  TransactionClass: new (...args: any[]) => MccTransactionType,
  request: ARReferencedPaymentNonexistence,
  iqm: IndexedQueryManager
): Promise<VerificationResponse<DHReferencedPaymentNonexistence>> {
  // TODO: check if anything needs to be done with: startBlock >= overflowBlock
  // DANGER: How to handle this if there are a lot of transactions with same payment reference in the interval?

  if (unPrefix0x(request.paymentReference) === unPrefix0x(ZERO_BYTES_32)) {
    return { status: VerificationStatus.ZERO_PAYMENT_REFERENCE_UNSUPPORTED };
  }

  if (!/^[0-9A-Fa-f]{64}$/.test(unPrefix0x(request.paymentReference))) {
    return { status: VerificationStatus.NOT_STANDARD_PAYMENT_REFERENCE };
  }

  const referencedTransactionsResponse = await iqm.getReferencedTransactions({
    minimalBlockNumber: numberLikeToNumber(request.minimalBlockNumber),
    deadlineBlockNumber: numberLikeToNumber(request.deadlineBlockNumber),
    deadlineBlockTimestamp: numberLikeToNumber(request.deadlineTimestamp),
    paymentReference: unPrefix0x(request.paymentReference),
  });

  const status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  // From here on these exist, dbTransactions can be an empty list.
  const dbTransactions = referencedTransactionsResponse.transactions;
  const firstOverflowBlock = referencedTransactionsResponse.firstOverflowBlock;
  const lowerBoundaryBlock = referencedTransactionsResponse.minimalBlock;

  return await responseReferencedPaymentNonExistence(
    dbTransactions,
    TransactionClass,
    firstOverflowBlock,
    lowerBoundaryBlock,
    request.deadlineBlockNumber,
    request.deadlineTimestamp,
    request.destinationAddressHash,
    request.paymentReference,
    request.amount
  );
}
