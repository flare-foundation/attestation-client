import { AlgoTransaction, prefix0x, toBN, TransactionSuccessStatus, unPrefix0x, XrpTransaction } from "flare-mcc";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { VerificationStatus } from "../attestation-types/attestation-types";
import { numberLikeToNumber } from "../attestation-types/attestation-types-helpers";
import { DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHPayment, DHReferencedPaymentNonexistence } from "../generated/attestation-hash-types";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence } from "../generated/attestation-request-types";
import { VerificationResponse, verifyWorkflowForTransaction, verifyNativePayment, verifyConfirmationBlock, verifyWorkflowForBlock, verifyWorkflowForReferencedTransactions } from "./verification-utils";
import Web3 from "web3";

export type AccountBasedType = AlgoTransaction | XrpTransaction;

export async function accountBasedPaymentVerification(
   TransactionClass: new (...args: any[]) => AccountBasedType,
   request: ARPayment,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHPayment>> {
   let blockNumber = numberLikeToNumber(request.blockNumber);

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: unPrefix0x(request.id), // TODO: verify this for other chains
      numberOfConfirmations,
      blockNumber,
      dataAvailabilityProof: request.dataAvailabilityProof,
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

   status = await verifyConfirmationBlock({
      recheck,
      blockNumber,
      numberOfConfirmations,
      roundId,
      dataAvailabilityProof:
         request.dataAvailabilityProof,
      iqm
   })
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   let paymentReference = fullTxData.reference.length === 1 ? prefix0x(fullTxData.reference[0]) : "";
   // Ignore too long payment references
   if(unPrefix0x(paymentReference).length > 64) {
      paymentReference = ""
   }

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      utxo: toBN(0),
      sourceAddress: Web3.utils.soliditySha3(fullTxData.sourceAddress[0]),
      receivingAddress: Web3.utils.soliditySha3(fullTxData.receivingAddress[0]),
      paymentReference: prefix0x(paymentReference),
      spentAmount: fullTxData.spentAmount[0].amount,
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
   let blockNumber = numberLikeToNumber(request.blockNumber);

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: unPrefix0x(request.id),
      numberOfConfirmations,
      blockNumber,
      dataAvailabilityProof: request.dataAvailabilityProof,
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

   status = await verifyConfirmationBlock({
      recheck,
      blockNumber,
      numberOfConfirmations,
      roundId,
      dataAvailabilityProof: request.dataAvailabilityProof,
      iqm
   })
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   let paymentReference = dbTransaction.paymentReference || "";
   // Ignore too long payment references
   if(unPrefix0x(paymentReference).length > 64) {
      paymentReference = ""
   }

   let response = {
      blockNumber: toBN(blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      sourceAddress: Web3.utils.soliditySha3(fullTxData.sourceAddress[0]),
      spentAmount: fullTxData.spentAmount?.[0]?.amount || toBN(0), // TODO: Check what is wrong with ALGO
      paymentReference: prefix0x(paymentReference)
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
   let blockNumber = numberLikeToNumber(request.blockNumber);

   const confirmedBlock = await iqm.getConfirmedBlock({
      dataAvailabilityProof: request.dataAvailabilityProof,
      numberOfConfirmations,
      blockNumber,
      roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   });

   let status = verifyWorkflowForBlock(confirmedBlock);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   const dbBlock = confirmedBlock.block;

   status = await verifyConfirmationBlock({
      recheck,
      blockNumber,
      numberOfConfirmations,
      roundId,
      dataAvailabilityProof: request.dataAvailabilityProof,
      iqm
   })

   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(dbBlock.blockNumber),
      blockTimestamp: toBN(dbBlock.timestamp)
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
   let overflowBlockNumber = numberLikeToNumber(request.overflowBlock);
   let endBlockNumber = numberLikeToNumber(request.endBlock);
   let endTime = numberLikeToNumber(request.endTimestamp);

   // TODO: check if anything needs to be done with: startBlock >= overflowBlock 
   const referencedTransactionsResponse = await iqm.getReferencedTransactions({
      numberOfConfirmations,
      paymentReference: request.paymentReference,
      overflowBlockNumber,
      dataAvailabilityProof: request.dataAvailabilityProof,
      roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   });

   let status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   // From here on thhese two exist, dbTransactions can be an empty list.
   const dbOverflowBlock = referencedTransactionsResponse.block;
   let dbTransactions = referencedTransactionsResponse.transactions;

   // Verify overflow block is confirmed
   status = await verifyConfirmationBlock({
      recheck,
      blockNumber: overflowBlockNumber,
      numberOfConfirmations,
      roundId,
      dataAvailabilityProof: request.dataAvailabilityProof,
      iqm
   })
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   if (request.endTimestamp >= dbOverflowBlock.timestamp) {
      return { status: VerificationStatus.WRONG_OVERFLOW_BLOCK_ENDTIMESTAMP }
   }
   if (request.endBlock >= dbOverflowBlock.blockNumber) {
      return { status: VerificationStatus.WRONG_OVERFLOW_BLOCK_ENDTIMESTAMP }
   }

   // Find the first overflow block
   let firstOverflowBlock = await iqm.getFirstConfirmedOverflowBlock(endTime, endBlockNumber);

   let startTimestamp = iqm.settings.windowStartTime(roundId);
   let firstCheckedBlock = await iqm.getFirstConfirmedBlockAfterTime(startTimestamp);

   // Check transactions for a matching
   // payment reference is ok, check `destinationAddress` and `amount`
   let matchFound = false;
   for (let dbTransaction of dbTransactions) {
      const parsedData = JSON.parse(dbTransaction.response);
      const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);
      const destinationAddressHash = Web3.utils.soliditySha3(fullTxData.receivingAddress[0]);
      const amount = toBN(fullTxData.receivedAmount[0].amount);
      if (destinationAddressHash === request.destinationAddress && amount.eq(toBN(request.amount))) {
         matchFound = true;
         break;
      }
   }

   if (matchFound) {
      return { status: VerificationStatus.REFERENCED_TRANSACTION_EXISTS }
   }

   let response = {
      endTimestamp: request.endTimestamp,
      endBlock: request.endBlock,
      destinationAddress: Web3.utils.soliditySha3(request.destinationAddress),
      paymentReference: prefix0x(request.paymentReference),
      amount: request.amount,
      firstCheckedBlock: toBN(firstCheckedBlock.blockNumber),
      firstCheckedBlockTimestamp: toBN(firstCheckedBlock.timestamp),
      firstOverflowBlock: toBN(firstOverflowBlock.blockNumber),
      firstOverflowBlockTimestamp: toBN(firstOverflowBlock.timestamp)
   } as DHReferencedPaymentNonexistence;

   return {
      status: VerificationStatus.OK,
      response
   }
}