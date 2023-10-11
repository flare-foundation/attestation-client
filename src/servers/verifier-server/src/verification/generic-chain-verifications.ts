import {
  BalanceDecreasingSummaryResponse,
  BalanceDecreasingSummaryStatus,
  MccClient,
  PaymentSummaryResponse,
  PaymentSummaryStatus,
  toBN,
  TransactionBase,
  TransactionSuccessStatus,
  unPrefix0x,
  ZERO_BYTES_32
} from "@flarenetwork/mcc";
import Web3 from "web3";
import { IIndexedQueryManager } from "../../../../indexed-query-manager/IIndexedQueryManager";
import { BlockResult, TransactionResult } from "../../../../indexed-query-manager/indexed-query-manager-types";
import { retry } from "../../../../utils/helpers/promiseTimeout";
import { logException } from "../../../../utils/logging/logger";
import { VerificationStatus } from "../../../../verification/attestation-types/attestation-types";
import { BalanceDecreasingTransaction_Request, BalanceDecreasingTransaction_Response, BalanceDecreasingTransaction_ResponseBody } from "../dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { ConfirmedBlockHeightExists_Request, ConfirmedBlockHeightExists_Response, ConfirmedBlockHeightExists_ResponseBody } from "../dtos/attestation-types/ConfirmedBlockHeightExists.dto";
import { Payment_Request, Payment_Response, Payment_ResponseBody } from "../dtos/attestation-types/Payment.dto";
import { ReferencedPaymentNonexistence_Request, ReferencedPaymentNonexistence_Response, ReferencedPaymentNonexistence_ResponseBody } from "../dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import {
  VerificationResponse,
  verifyWorkflowForBlock,
  verifyWorkflowForReferencedTransactions,
  verifyWorkflowForTransaction
} from "./verification-utils";

/**
 * Serialize bigints to strings recursively.
 * @param obj 
 * @returns 
 */
function serializeBigInts(obj: any) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value // return everything else unchanged
  ));
}
//////////////////////////////////////////////////
// Verification functions
/////////////////////////////////////////////////

/**
 * Auxillary function for assembling attestation response for 'Payment' attestation type.
 * @param dbTransaction
 * @param TransactionClass
 * @param request
 * @param client
 * @returns
 */
export async function responsePayment<T extends TransactionBase>(
  dbTransaction: TransactionResult,
  TransactionClass: new (...args: any[]) => T,
  request: Payment_Request,
  client?: MccClient
) {
  let parsedData: any;
  try {
    parsedData = JSON.parse(dbTransaction.getResponse());
  } catch (error) {
    logException(error, `responsePayment '${dbTransaction.transactionId}' JSON parse '${dbTransaction.getResponse()}'`);
    return { status: VerificationStatus.SYSTEM_FAILURE };
  }

  const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

  const inUtxoNumber = parseInt(BigInt(request.requestBody.inUtxo).toString());
  const utxoNumber = parseInt(BigInt(request.requestBody.utxo).toString())

  let paymentSummary = await fullTxData.paymentSummary({ client, inUtxo: inUtxoNumber, outUtxo: utxoNumber });

  if (paymentSummary.status !== PaymentSummaryStatus.Success) {
    return { status: VerificationStatus.NOT_CONFIRMED };
  }

  if (!paymentSummary.response) {
    throw new Error("critical error: should always have response");
  }

  const response = {
    attestationType: request.attestationType,
    sourceId: request.sourceId,
    votingRound: "0",
    lowestUsedTimestamp: dbTransaction.timestamp.toString(),
    requestBody: serializeBigInts(request.requestBody),
    responseBody: {
      blockNumber: dbTransaction.blockNumber.toString(),
      blockTimestamp: dbTransaction.timestamp.toString(),
      sourceAddressHash: paymentSummary.response.sourceAddressHash,
      intendedSourceAddressHash: paymentSummary.response.intendedSourceAddressHash,
      receivingAddressHash: paymentSummary.response.receivingAddressHash,
      intendedReceivingAddressHash: paymentSummary.response.intendedReceivingAddressHash,
      standardPaymentReference: paymentSummary.response.paymentReference,
      spentAmount: paymentSummary.response.spentAmount.toString(),
      intendedSpentAmount: paymentSummary.response.intendedSourceAmount.toString(),
      receivedAmount: paymentSummary.response.receivedAmount.toString(),
      intendedReceivedAmount: paymentSummary.response.intendedReceivingAmount.toString(),
      oneToOne: paymentSummary.response.oneToOne,
      status: fullTxData.successStatus.toString(),
    } as Payment_ResponseBody
  } as Payment_Response;

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
export async function verifyPayment<T extends TransactionBase>(
  TransactionClass: new (...args: any[]) => T,
  request: Payment_Request,
  iqm: IIndexedQueryManager,
  client?: MccClient
): Promise<VerificationResponse<Payment_Response>> {
  // Check for transaction
  const confirmedTransactionResult = await iqm.getConfirmedTransaction({
    txId: unPrefix0x(request.requestBody.transactionId),
  });

  let status = verifyWorkflowForTransaction(confirmedTransactionResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbTransaction = confirmedTransactionResult.transaction;
  return await responsePayment(dbTransaction, TransactionClass, request, client);
}

/**
 * Auxillary function for assembling attestation response for 'BalanceDecreasingTransaction' attestation type.
 * @param dbTransaction
 * @param TransactionClass
 * @param sourceAddressIndicator
 * @param client
 * @returns
 */
export async function responseBalanceDecreasingTransaction<T extends TransactionBase>(
  dbTransaction: TransactionResult,
  TransactionClass: new (...args: any[]) => T,
  request: BalanceDecreasingTransaction_Request,
  client?: MccClient
) {
  let parsedData: any;
  try {
    parsedData = JSON.parse(dbTransaction.getResponse());
  } catch (error) {
    logException(error, `responseBalanceDecreasingTransaction '${dbTransaction.transactionId}' JSON parse '${dbTransaction.getResponse()}'`);
    return { status: VerificationStatus.SYSTEM_FAILURE };
  }

  const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);

  let balanceDecreasingSummary: BalanceDecreasingSummaryResponse;
  balanceDecreasingSummary = await fullTxData.balanceDecreasingSummary({ client, sourceAddressIndicator: request.requestBody.sourceAddressIndicator });
  if (balanceDecreasingSummary.status !== BalanceDecreasingSummaryStatus.Success) {
    return { status: VerificationStatus.NOT_CONFIRMED };
  }

  if (!balanceDecreasingSummary.response) {
    throw new Error("critical error: should always have response");
  }

  const response = {
    attestationType: request.attestationType,
    sourceId: request.sourceId,
    votingRound: "0",
    lowestUsedTimestamp: dbTransaction.timestamp.toString(),
    requestBody: serializeBigInts(request.requestBody),
    responseBody: {
      blockNumber: dbTransaction.blockNumber.toString(),
      blockTimestamp: dbTransaction.timestamp.toString(),
      sourceAddressHash: balanceDecreasingSummary.response.sourceAddressHash,
      spentAmount: balanceDecreasingSummary.response.spentAmount.toString(),
      standardPaymentReference: balanceDecreasingSummary.response.paymentReference,
    } as BalanceDecreasingTransaction_ResponseBody
  } as BalanceDecreasingTransaction_Response;

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
export async function verifyBalanceDecreasingTransaction<T extends TransactionBase>(
  TransactionClass: new (...args: any[]) => T,
  request: BalanceDecreasingTransaction_Request,
  iqm: IIndexedQueryManager,
  client?: MccClient
): Promise<VerificationResponse<BalanceDecreasingTransaction_Response>> {

  // Check for transaction
  const confirmedTransactionResult = await iqm.getConfirmedTransaction({
    txId: unPrefix0x(request.requestBody.transactionId),
  });

  let status = verifyWorkflowForTransaction(confirmedTransactionResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbTransaction = confirmedTransactionResult.transaction;
  return await responseBalanceDecreasingTransaction(dbTransaction, TransactionClass, request, client);
}

/**
 * Auxillary function for assembling attestation response for 'ConfirmedBlockHeightExists' attestation type.
 * @param dbBlock
 * @param lowerQueryWindowBlock
 * @param numberOfConfirmations
 * @param request
 * @returns
 */
export async function responseConfirmedBlockHeightExists(
  dbBlock: BlockResult,
  lowerQueryWindowBlock: BlockResult,
  numberOfConfirmations: number,
  request: ConfirmedBlockHeightExists_Request
) {
  const response = {
    attestationType: request.attestationType,
    sourceId: request.sourceId,
    votingRound: "0",
    lowestUsedTimestamp: dbBlock.timestamp.toString(),
    requestBody: serializeBigInts(request.requestBody),
    responseBody: {
      blockNumber: dbBlock.blockNumber.toString(),
      blockTimestamp: dbBlock.timestamp.toString(),
      numberOfConfirmations: numberOfConfirmations.toString(),
      lowestQueryWindowBlockNumber: lowerQueryWindowBlock.blockNumber.toString(),
      lowestQueryWindowBlockTimestamp: lowerQueryWindowBlock.timestamp.toString(),
    } as ConfirmedBlockHeightExists_ResponseBody,
  } as ConfirmedBlockHeightExists_Response;

  return {
    status: VerificationStatus.OK,
    response,
  };
}

/**
 * `ConfirmedBlockHeightExists` attestation type verification function performing synchronized indexer queries
 * @param request attestation request
 * @param iqm IndexedQuery object for the relevant blockchain indexer
 * @returns Verification response, status and attestation response
 */
export async function verifyConfirmedBlockHeightExists(
  request: ConfirmedBlockHeightExists_Request,
  iqm: IIndexedQueryManager
): Promise<VerificationResponse<ConfirmedBlockHeightExists_Response>> {
  const confirmedBlockQueryResult = await iqm.getConfirmedBlock({
    blockNumber: parseInt(BigInt(request.requestBody.blockNumber).toString()),
  });

  const status = verifyWorkflowForBlock(confirmedBlockQueryResult);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  const dbBlock = confirmedBlockQueryResult.block;
  const lowerQueryWindowBlock = await iqm.getLastConfirmedBlockStrictlyBeforeTime(
    dbBlock.timestamp - parseInt(BigInt(request.requestBody.queryWindow).toString())
  );

  if (!lowerQueryWindowBlock) {
    return {
      status: VerificationStatus.DATA_AVAILABILITY_ISSUE,
    };
  }
  return await responseConfirmedBlockHeightExists(dbBlock, lowerQueryWindowBlock, iqm.numberOfConfirmations(), request);
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
export async function responseReferencedPaymentNonExistence<T extends TransactionBase>(
  dbTransactions: TransactionResult[],
  TransactionClass: new (...args: any[]) => T,
  firstOverflowBlock: BlockResult,
  lowerBoundaryBlock: BlockResult,
  request: ReferencedPaymentNonexistence_Request
) {
  // Check transactions for a matching
  for (const dbTransaction of dbTransactions) {
    let fullTxData: T;
    try {
      const parsedData = JSON.parse(dbTransaction.getResponse());
      fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);
    } catch (e) {
      return { status: VerificationStatus.SYSTEM_FAILURE };
    }

    // In account based case this loop goes through only once.
    for (let outUtxo = 0; outUtxo < fullTxData.intendedReceivedAmounts.length; outUtxo++) {
      const address = fullTxData.intendedReceivedAmounts[outUtxo].address;
      // TODO: standard address hash
      const destinationAddressHashTmp = Web3.utils.soliditySha3(address);
      if (destinationAddressHashTmp === request.requestBody.destinationAddressHash) {
        const paymentSummary = (await retry(`responseReferencedPaymentNonExistence::paymentSummary`, async () =>
          fullTxData.paymentSummary({ inUtxo: 0, outUtxo })
        )) as PaymentSummaryResponse;

        if (paymentSummary.status !== PaymentSummaryStatus.Success) {
          // the address indicated in destinationAddressHash was fully checked, no need to proceed with utxos
          break;
        }

        if (!paymentSummary.response) {
          throw new Error("critical error: should always have response");
        }
        if (paymentSummary.response.intendedReceivingAmount.gte(toBN(request.requestBody.amount.toString()))) {
          if (paymentSummary.response.transactionStatus !== TransactionSuccessStatus.SENDER_FAILURE) {
            // it must be SUCCESS or RECEIVER_FAULT, so the sender sent it correctly
            return { status: VerificationStatus.REFERENCED_TRANSACTION_EXISTS };
          }
        }
        break;
      }
    }
  }

  const response = {
    attestationType: request.attestationType,
    sourceId: request.sourceId,
    votingRound: "0",
    lowestUsedTimestamp: lowerBoundaryBlock.timestamp.toString(),
    requestBody: serializeBigInts(request.requestBody),
    responseBody: {
      minimalBlockTimestamp: lowerBoundaryBlock.blockNumber.toString(),
      firstOverflowBlockNumber: firstOverflowBlock.blockNumber.toString(),
      firstOverflowBlockTimestamp: firstOverflowBlock.timestamp.toString(),
    } as ReferencedPaymentNonexistence_ResponseBody,
  } as ReferencedPaymentNonexistence_Response;

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
export async function verifyReferencedPaymentNonExistence<T extends TransactionBase>(
  TransactionClass: new (...args: any[]) => T,
  request: ReferencedPaymentNonexistence_Request,
  iqm: IIndexedQueryManager
): Promise<VerificationResponse<ReferencedPaymentNonexistence_Response>> {
  // TODO: check if anything needs to be done with: startBlock >= overflowBlock
  // DANGER: How to handle this if there are a lot of transactions with same payment reference in the interval?

  if (unPrefix0x(request.requestBody.standardPaymentReference) === unPrefix0x(ZERO_BYTES_32)) {
    return { status: VerificationStatus.ZERO_PAYMENT_REFERENCE_UNSUPPORTED };
  }

  if (!/^[0-9A-Fa-f]{64}$/.test(unPrefix0x(request.requestBody.standardPaymentReference))) {
    return { status: VerificationStatus.NOT_STANDARD_PAYMENT_REFERENCE };
  }

  const minimalBlockNumber = parseInt(BigInt(request.requestBody.minimalBlockNumber).toString());
  const deadlineBlockNumber = parseInt(BigInt(request.requestBody.deadlineBlockNumber).toString());

  const referencedTransactionsResponse = await iqm.getReferencedTransactions({
    minimalBlockNumber,
    deadlineBlockNumber,
    deadlineBlockTimestamp: parseInt(BigInt(request.requestBody.deadlineTimestamp).toString()),
    paymentReference: unPrefix0x(request.requestBody.standardPaymentReference),
  });

  const status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
  if (status !== VerificationStatus.NEEDS_MORE_CHECKS) {
    return { status };
  }

  // From here on these exist, dbTransactions can be an empty list.
  const dbTransactions = referencedTransactionsResponse.transactions;
  const firstOverflowBlock = referencedTransactionsResponse.firstOverflowBlock;
  const lowerBoundaryBlock = referencedTransactionsResponse.minimalBlock;

  if (minimalBlockNumber >= firstOverflowBlock.blockNumber) {
    return {
      status: VerificationStatus.NOT_CONFIRMED,
    };
  }

  return await responseReferencedPaymentNonExistence(
    dbTransactions,
    TransactionClass,
    firstOverflowBlock,
    lowerBoundaryBlock,
    request
  );
}
