import { AlgoTransaction, prefix0x, toBN, TransactionSuccessStatus, unPrefix0x, XrpTransaction } from "flare-mcc";
import Web3 from "web3";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { VerificationStatus } from "../attestation-types/attestation-types";
import { numberLikeToNumber } from "../attestation-types/attestation-types-helpers";
import { DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHPayment, DHReferencedPaymentNonexistence } from "../generated/attestation-hash-types";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence } from "../generated/attestation-request-types";
import { VerificationResponse, verifyNativePayment, verifyWorkflowForBlock, verifyWorkflowForReferencedTransactions, verifyWorkflowForTransaction } from "./verification-utils";

export type AccountBasedType = AlgoTransaction | XrpTransaction;


export function extractStandardizedPaymentReference(fullTxData: AccountBasedType) {
   let paymentReference = fullTxData.reference.length === 1 ? prefix0x(fullTxData.reference[0]) : "";
   // Ignore too long payment references
   if (unPrefix0x(paymentReference).length > 64) {
      paymentReference = ""
   }
   return prefix0x(paymentReference);
}

export async function accountBasedPaymentVerification(
   TransactionClass: new (...args: any[]) => AccountBasedType,
   request: ARPayment,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHPayment>> {

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: unPrefix0x(request.id),
      numberOfConfirmations,
      upperBoundProof: request.upperBoundProof,
      roundId: roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   })

   let status = verifyWorkflowForTransaction(confirmedTransactionResult);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   const dbTransaction = confirmedTransactionResult.transaction;
   const parsedData = JSON.parse(confirmedTransactionResult.transaction.response);
   const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData)

   status = verifyNativePayment(fullTxData);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   let paymentReference = extractStandardizedPaymentReference(fullTxData);

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(dbTransaction.blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      inUtxo: toBN(0),
      utxo: toBN(0),
      sourceAddressHash: Web3.utils.soliditySha3(fullTxData.sourceAddress[0]),
      receivingAddressHash: Web3.utils.soliditySha3(fullTxData.receivingAddress[0]),
      paymentReference,
      spentAmount: fullTxData.spentAmount[0].amount,
      // TODO: what do we actually get as received amount on failed payments
      receivedAmount: fullTxData.successStatus === TransactionSuccessStatus.SUCCESS ? fullTxData.receivedAmount[0].amount : toBN(0),
      oneToOne: true,
      status: toBN(fullTxData.successStatus)
   } as DHPayment;

   return {
      status: VerificationStatus.OK,
      response
   }
}


export async function accountBasedBalanceDecreasingTransactionVerification(
   TransactionClass: new (...args: any[]) => AccountBasedType,
   request: ARBalanceDecreasingTransaction,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHBalanceDecreasingTransaction>> {

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: unPrefix0x(request.id),
      numberOfConfirmations,
      upperBoundProof: request.upperBoundProof,
      roundId: roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   })

   let status = verifyWorkflowForTransaction(confirmedTransactionResult);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   const dbTransaction = confirmedTransactionResult.transaction;
   const parsedData = JSON.parse(confirmedTransactionResult.transaction.response);
   const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData)

   let paymentReference = extractStandardizedPaymentReference(fullTxData);
   let response = {
      blockNumber: toBN(dbTransaction.blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      inUtxo: toBN(0),
      sourceAddressHash: Web3.utils.soliditySha3(fullTxData.sourceAddress[0]),
      spentAmount: fullTxData.spentAmount?.[0]?.amount || toBN(0), // TODO: Check what is wrong with ALGO
      paymentReference
   } as DHBalanceDecreasingTransaction;

   return {
      status: VerificationStatus.OK,
      response
   }
}

export async function accountBasedConfirmedBlockHeightExistsVerification(
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
      type: recheck ? 'RECHECK' : 'FIRST_CHECK',
      returnQueryBoundaryBlocks: true
   });

   let status = verifyWorkflowForBlock(confirmedBlockQueryResult);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   const dbBlock = confirmedBlockQueryResult.block;

   let averageBlockProductionTimeMs = toBN(Math.floor(
      (confirmedBlockQueryResult.upperBoundaryBlock.timestamp - confirmedBlockQueryResult.lowerBoundaryBlock.timestamp)*1000 /
      (confirmedBlockQueryResult.upperBoundaryBlock.blockNumber - confirmedBlockQueryResult.lowerBoundaryBlock.blockNumber)
   ));
   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(dbBlock.blockNumber),
      blockTimestamp: toBN(dbBlock.timestamp),
      numberOfConfirmations: toBN(numberOfConfirmations),
      averageBlockProductionTimeMs
   } as DHConfirmedBlockHeightExists;

   return {
      status: VerificationStatus.OK,
      response
   }
}

export async function accountBasedReferencedPaymentNonExistence(
   TransactionClass: new (...args: any[]) => AccountBasedType,
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
      type: recheck ? 'RECHECK' : 'FIRST_CHECK',
   });

   let status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   // From here on these two exist, dbTransactions can be an empty list.
   let dbTransactions = referencedTransactionsResponse.transactions;
   let firstOverflowBlock = referencedTransactionsResponse.firstOverflowBlock;
   let lowerBoundaryBlock = referencedTransactionsResponse.lowerBoundaryBlock;

   // Check transactions for a matching
   // payment reference is ok, check `destinationAddress` and `amount`
   let matchFound = false;
   for (let dbTransaction of dbTransactions) {
      const parsedData = JSON.parse(dbTransaction.response);
      const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);
      const destinationAddressHash = Web3.utils.soliditySha3(fullTxData.receivingAddress[0]);
      const amount = toBN(fullTxData.receivedAmount[0].amount);
      if (destinationAddressHash === request.destinationAddressHash && amount.eq(toBN(request.amount))) {
         matchFound = true;
         break;
      }
   }

   if (matchFound) {
      return { status: VerificationStatus.REFERENCED_TRANSACTION_EXISTS }
   }

   let response = {
      stateConnectorRound: roundId,
      deadlineBlockNumber: request.deadlineBlockNumber,
      deadlineTimestamp: request.deadlineTimestamp,
      destinationAddressHash: Web3.utils.soliditySha3(request.destinationAddressHash),
      paymentReference: prefix0x(request.paymentReference),
      amount: request.amount,
      lowerBoundaryBlockNumber: toBN(lowerBoundaryBlock.blockNumber),
      lowerBoundaryBlockTimestamp: toBN(lowerBoundaryBlock.timestamp),
      firstOverflowBlockNumber: toBN(firstOverflowBlock.blockNumber),
      firstOverflowBlockTimestamp: toBN(firstOverflowBlock.timestamp)
   } as DHReferencedPaymentNonexistence;

   return {
      status: VerificationStatus.OK,
      response
   }
}