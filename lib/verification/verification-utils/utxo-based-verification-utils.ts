import BN from "bn.js";
import { BtcTransaction, DogeTransaction, LtcTransaction, MCC, prefix0x, toBN, unPrefix0x } from "flare-mcc";
import Web3 from "web3";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { VerificationStatus } from "../attestation-types/attestation-types";
import { numberLikeToNumber } from "../attestation-types/attestation-types-helpers";
import { DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHPayment, DHReferencedPaymentNonexistence } from "../generated/attestation-hash-types";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence } from "../generated/attestation-request-types";
import { VerificationResponse, verifyNativePayment, verifyWorkflowForBlock, verifyWorkflowForReferencedTransactions, verifyWorkflowForTransaction } from "./verification-utils";

type UtxoType = BtcTransaction | LtcTransaction | DogeTransaction;
type UtxoClientType = MCC.BTC | MCC.DOGE | MCC.LTC;

export function extractStandardizedPaymentReference(fullTxData: UtxoType) {
   let paymentReference = fullTxData.reference.length === 1 ? prefix0x(fullTxData.reference[0]) : "";
   // Ignore too long payment references
   if (unPrefix0x(paymentReference).length > 64) {
      paymentReference = ""
   }
   return prefix0x(paymentReference);
}
interface SourceProcessingResult {
   sourceAddress?: string;
   spentAmount?: BN;
   oneToOne?: boolean;
   status: VerificationStatus
}

function processAllInputs(fullTxData: UtxoType, inUtxoNumber: number, receivingAddress?: string): SourceProcessingResult {
   // `spentAmount` is difference between the sum of all inputs from sourceAddress and returns to it
   // `oneToOne` is true, if everyting goes just from one address to another (except returns)
   let inFunds = toBN(0);
   let returnFunds = toBN(0);
   let oneToOne: boolean = !!receivingAddress;
   let sourceAddress = fullTxData.sourceAddress[inUtxoNumber];
   for (let vin of fullTxData.spentAmount) {
      if (vin.address === sourceAddress) {
         inFunds = inFunds.add(vin.amount);
      } else {
         oneToOne = false;
      }
   }
   for (let vout of fullTxData.receivedAmount) {
      if (vout.address === sourceAddress) {
         returnFunds = returnFunds.add(vout.amount);
      } else if (receivingAddress && vout.address != receivingAddress) {
         oneToOne = false;
      }
   }
   return {
      sourceAddress,
      spentAmount: inFunds.sub(returnFunds),
      oneToOne,
      status: VerificationStatus.NEEDS_MORE_CHECKS
   };
}

async function processSingleInput(client: UtxoClientType, fullTxData: UtxoType, inUtxoNumber: number): Promise<SourceProcessingResult> {
   let txId = fullTxData.data?.vin?.[inUtxoNumber]?.txid;
   if (!txId) {
      return {
         status: VerificationStatus.NON_EXISTENT_INPUT_UTXO_ADDRESS
      }
   }

   // read the relevant in transaction to find out address and value on inUtxo
   let inTransaction = await client.getTransaction(txId);
   let inVout = fullTxData.data.vin[inUtxoNumber].vout;
   // let sourceAddress = inTransaction?.extractVoutAt(inVout)?.scriptPubKey?.addresses[0];
   let sourceAddress = inTransaction.receivingAddress?.[inVout];
   if (!sourceAddress) {
      return {
         status: VerificationStatus.NON_EXISTENT_INPUT_UTXO_ADDRESS
      }
   }
   // spentAmount just taken from inUtxo
   let spentAmount = toBN(inTransaction.receivedAmount?.[inVout].amount);
   // false since is not determinable
   let oneToOne = false;
   return {
      sourceAddress,
      spentAmount,
      oneToOne,
      status: VerificationStatus.NEEDS_MORE_CHECKS
   }
}

export async function utxoBasedPaymentVerification(
   TransactionClass: new (...args: any[]) => UtxoType,
   request: ARPayment,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager,
   client: UtxoClientType
): Promise<VerificationResponse<DHPayment>> {
   // let blockNumber = numberLikeToNumber(request.blockNumber);

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

   // Correct receivingAddress
   let utxoNumber = toBN(request.utxo).toNumber();
   if (!fullTxData.receivingAddress?.[utxoNumber]) {
      return {
         status: VerificationStatus.NON_EXISTENT_OUTPUT_UTXO_ADDRESS
      }
   }
   let receivingAddress = fullTxData.receivingAddress[utxoNumber];

   // Received amount is always just that one on `utxo` output.
   let receivedAmount = fullTxData.receivedAmount[utxoNumber].amount;


   // !!!
   let inUtxoNumber = toBN(request.inUtxo).toNumber();
   if (!fullTxData.sourceAddress?.[inUtxoNumber]) {
      return {
         status: VerificationStatus.NON_EXISTENT_INPUT_UTXO_ADDRESS
      }
   }

   let result = dbTransaction.paymentReference
      ? processAllInputs(fullTxData, inUtxoNumber, receivingAddress)
      : await processSingleInput(client, fullTxData, inUtxoNumber);

   if (result.status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   let paymentReference = extractStandardizedPaymentReference(fullTxData);

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(dbTransaction.blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      inUtxo: toBN(request.inUtxo),
      utxo: toBN(request.utxo),
      sourceAddressHash: Web3.utils.soliditySha3(result.sourceAddress),
      receivingAddressHash: Web3.utils.soliditySha3(receivingAddress),
      paymentReference,
      spentAmount: result.spentAmount,
      receivedAmount,
      oneToOne: result.oneToOne,
      status: toBN(fullTxData.successStatus)
   } as DHPayment;

   return {
      status: VerificationStatus.OK,
      response
   }
}


export async function utxoBasedBalanceDecreasingTransactionVerification(
   TransactionClass: new (...args: any[]) => UtxoType,
   request: ARBalanceDecreasingTransaction,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager,
   client: UtxoClientType
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

   let inUtxoNumber = toBN(request.inUtxo).toNumber();
   if (!fullTxData.sourceAddress?.[inUtxoNumber]) {
      return {
         status: VerificationStatus.NON_EXISTENT_INPUT_UTXO_ADDRESS
      }
   }

   let result = dbTransaction.paymentReference
      ? processAllInputs(fullTxData, inUtxoNumber)
      : await processSingleInput(client, fullTxData, inUtxoNumber);

   if (result.status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   let paymentReference = extractStandardizedPaymentReference(fullTxData);

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(dbTransaction.blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      inUtxo: request.inUtxo,
      sourceAddressHash: Web3.utils.soliditySha3(result.sourceAddress),
      spentAmount: result.spentAmount,
      paymentReference
   } as DHBalanceDecreasingTransaction;

   return {
      status: VerificationStatus.OK,
      response
   }
}

export async function utxoBasedConfirmedBlockHeightExistsVerification(
   request: ARConfirmedBlockHeightExists,
   roundId: number,
   numberOfConfirmations: number,
   recheck: boolean,
   iqm: IndexedQueryManager
): Promise<VerificationResponse<DHConfirmedBlockHeightExists>> {
   // let blockNumber = numberLikeToNumber(request.blockNumber);

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

export async function utxoBasedReferencedPaymentNonExistence(
   TransactionClass: new (...args: any[]) => UtxoType,
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

   // From here on thhese two exist, dbTransactions can be an empty list.
   let dbTransactions = referencedTransactionsResponse.transactions;
   let firstOverflowBlock = referencedTransactionsResponse.firstOverflowBlock;
   let lowerBoundaryBlock = referencedTransactionsResponse.lowerBoundaryBlock;

   // Check transactions for a matching
   // payment reference is ok, check `destinationAddress` and `amount`
   let matchFound = false;
   for (let dbTransaction of dbTransactions) {
      const parsedData = JSON.parse(dbTransaction.response);
      const fullTxData = new TransactionClass(parsedData.data, parsedData.additionalData);
      
      let totalAmount = toBN(0);
      let destinationHashExists = false;
      for (let output of fullTxData.receivedAmount) {
         const amount = toBN(output.amount);
         const destinationAddressHash = Web3.utils.soliditySha3(output.address);
         if (destinationAddressHash === request.destinationAddressHash) {
            destinationHashExists = true;
            totalAmount = totalAmount.add(amount);
         }
      }

      if(destinationHashExists && totalAmount.eq(toBN(request.amount))) {
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