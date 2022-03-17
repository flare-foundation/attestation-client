import { AlgoTransaction, toBN, TransactionBase } from "flare-mcc";
import { ConfirmedBlockQueryRequest, ConfirmedBlockQueryResponse, ConfirmedTransactionQueryResponse, ReferencedTransactionsQueryResponse } from "../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../indexed-query-manager/IndexedQueryManager";
import { Indexer } from "../indexer/indexer";
import { VerificationStatus } from "./attestation-types/attestation-types";
import { numberLikeToNumber, randSol } from "./attestation-types/attestation-types-helpers";
import { DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHPayment, DHReferencedPaymentNonexistence } from "./generated/attestation-hash-types";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence, ARType } from "./generated/attestation-request-types";

export function verifyWorkflowForTransaction(result: ConfirmedTransactionQueryResponse) {
   if (result.status === 'RECHECK') {
      return VerificationStatus.RECHECK_LATER
   }

   if (result.status === 'NOT_EXIST' || !result.transaction) {
      return VerificationStatus.NON_EXISTENT_TRANSACTION
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}


export function verifyWorkflowForBlock(result: ConfirmedBlockQueryResponse) {
   if (result.status === 'RECHECK') {
      return VerificationStatus.RECHECK_LATER
   }

   if (result.status === 'NOT_EXIST' || !result.block) {
      return VerificationStatus.NON_EXISTENT_BLOCK
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}

export function verifyWorkflowForReferencedTransactions(result: ReferencedTransactionsQueryResponse) {
   if (result.status === 'RECHECK') {
      return VerificationStatus.RECHECK_LATER
   }

   if (result.status === 'NO_OVERFLOW_BLOCK' || !result.block) {
      return VerificationStatus.NON_EXISTENT_BLOCK
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}

export function verifyIsAccountBased(fullTxData: TransactionBase<any, any>) {
   if (fullTxData.sourceAddress.length !== 1) {
      return VerificationStatus.NOT_SINGLE_SOURCE_ADDRESS
   }

   if (fullTxData.receivingAddress.length !== 1) {
      return VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS
   }

   if (fullTxData.reference.length !== 1) {
      return VerificationStatus.NOT_SINGLE_PAYMENT_REFERENCE
   }

   return VerificationStatus.NEEDS_MORE_CHECKS;
}

export interface RecheckParams {
   recheck: boolean;
   blockNumber: number;
   numberOfConfirmations: number;
   roundId: number;
   dataAvailabilityProof: string
   iqm: IndexedQueryManager
}

export async function verifyConfirmationBlock(params: RecheckParams) {
   if (params.recheck) {
      let confirmationBlockIndex = params.blockNumber + params.numberOfConfirmations;
      let confirmationBlock = await params.iqm.queryBlock({
         blockNumber: confirmationBlockIndex,
         roundId: params.roundId
      });
      if (!confirmationBlock) {
         return VerificationStatus.NOT_CONFIRMED
      }
      if (confirmationBlock.blockHash != params.dataAvailabilityProof) {
         return VerificationStatus.WRONG_DATA_AVAILABILITY_PROOF
      }
   }
   return VerificationStatus.NEEDS_MORE_CHECKS;
}

export function verifyNativePayment(fullTxData: TransactionBase<any, any>) {
   if (!fullTxData.isNativePayment) {
      return VerificationStatus.NOT_PAYMENT
   }
   return VerificationStatus.NEEDS_MORE_CHECKS;
}


export interface VerificationResponse<T> {
   status: VerificationStatus;
   response?: T;
}

export async function accountBasedPaymentVerification(
   TransactionClass: any,
   request: ARPayment,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHPayment>>
{
   let blockNumber = numberLikeToNumber(request.blockNumber);

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: request.id,
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

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: dbTransaction.transactionId,
      utxo: toBN(0),
      sourceAddress: fullTxData.sourceAddress[0],
      receivingAddress: fullTxData.receivingAddress[0],
      paymentReference: fullTxData.reference.length === 1 ? fullTxData.reference[0] : "",
      spentAmount: fullTxData.spentAmount[0].amount,
      receivedAmount: fullTxData.receivedAmount[0].amount,
      oneToOne: true,
      status: toBN(fullTxData.successStatus)
   } as DHPayment;

   return {
      status: VerificationStatus.OK,
      response
   }
}


export async function accountBasedBalanceDecreasingTransactionVerification(
   TransactionClass: any,
   request: ARBalanceDecreasingTransaction,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHBalanceDecreasingTransaction>>
{
   let blockNumber = numberLikeToNumber(request.blockNumber);

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: request.id,
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

   let response = {
      blockNumber: toBN(blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: dbTransaction.transactionId,
      sourceAddress: fullTxData.sourceAddress[0], 
      spentAmount: fullTxData.spentAmount[0].amount,
      paymentReference: fullTxData.reference.length === 1 ? fullTxData.reference[0] : ""     
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
): Promise<VerificationResponse<DHConfirmedBlockHeightExists>>
{
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

export async function accountBasedReferencedPaymentNonExistence (
   request: ARReferencedPaymentNonexistence,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHReferencedPaymentNonexistence>>
{
   // let blockNumber = numberLikeToNumber(request.blockNumber);

   // numberOfConfirmations: number; 
   // paymentReference: string; // payment reference
   // startBlockNumber: number; // starting block for search. Overrides default starting time.
   // // Used to determine overflow block - the first block with blockNumber > endBlock and timestamp > endTime
   // overflowBlockNumber: number;
   // dataAvailabilityProof: string; // hash of confirmation block of the overflow block
   // roundId: number; // voting round id for check
   // type: IndexerQueryType; // FIRST_CHECK` or`RECHECK`
 
   let overflowBlockNumber = numberLikeToNumber(request.overflowBlock);

   // TODO: Verify startBlock < overflowBlock
   const referencedTransactionsResponse = await iqm.getReferencedTransactions({
      numberOfConfirmations,
      paymentReference: request.paymentReference,
      startBlockNumber: numberLikeToNumber(request.startBlock),
      overflowBlockNumber,
      dataAvailabilityProof: request.dataAvailabilityProof,
      roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   });

   let status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   const dbOverflowBlock = referencedTransactionsResponse.block;

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

   // TODO - can transactions be null list?
   let dbTransactions = referencedTransactionsResponse.transactions;
   
   // TODO
   // Check if overflow block is ok
   // Find first overflow block
   // Check transactions for a matching

   let response = {
      // This parameters are only shadowed from request
      // FROM HERE
      endTimestamp: request.endTimestamp,
      endBlock: request.endBlock,
      destinationAddress: request.destinationAddress, 
      paymentReference: request.paymentReference,
      amount: request.amount, 
      // TO HERE, TODO - fill it in
      firstCheckedBlock: randSol(request, "firstCheckedBlock", "uint64") as BN,
      firstCheckedBlockTimestamp: randSol(request, "firstCheckedBlockTimestamp", "uint64") as BN,
      firstOverflowBlock: randSol(request, "firstOverflowBlock", "uint64") as BN,
      firstOverflowBlockTimestamp: randSol(request, "firstOverflowBlockTimestamp", "uint64") as BN      
   } as DHReferencedPaymentNonexistence;

   return {
      status: VerificationStatus.OK,
      response
   }
}