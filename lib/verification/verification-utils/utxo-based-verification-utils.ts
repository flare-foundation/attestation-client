import { BtcTransaction, DogeTransaction, LtcTransaction, MCC, prefix0x, toBN, unPrefix0x } from "flare-mcc";
import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { VerificationStatus } from "../attestation-types/attestation-types";
import { numberLikeToNumber } from "../attestation-types/attestation-types-helpers";
import { DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHPayment, DHReferencedPaymentNonexistence } from "../generated/attestation-hash-types";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence } from "../generated/attestation-request-types";
import { VerificationResponse, verifyConfirmationBlock, verifyNativePayment, verifyWorkflowForBlock, verifyWorkflowForReferencedTransactions, verifyWorkflowForTransaction } from "./verification-utils";
import BN from "bn.js";
import Web3 from "web3";

type UtxoType = BtcTransaction | LtcTransaction | DogeTransaction;
type UtxoClientType = MCC.BTC | MCC.DOGE | MCC.LTC;

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
   let blockNumber = numberLikeToNumber(request.blockNumber);

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: unPrefix0x(request.id),
      numberOfConfirmations,
      blockNumber,
      upperBoundProof: request.dataAvailabilityProof,
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
      dataAvailabilityProof: request.dataAvailabilityProof,
      iqm
   })
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

   // Received amout is always just that one on `utxo` output.
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

   let paymentReference = dbTransaction.paymentReference || "";
   // Ignore too long payment references
   if(unPrefix0x(paymentReference).length > 64) {
      paymentReference = ""
   }

   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(blockNumber),
      blockTimestamp: toBN(dbTransaction.timestamp),
      transactionHash: prefix0x(dbTransaction.transactionId),
      utxo: toBN(request.utxo),
      sourceAddress: Web3.utils.soliditySha3(result.sourceAddress),
      receivingAddress: Web3.utils.soliditySha3(receivingAddress),
      paymentReference: prefix0x(paymentReference),
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
   let blockNumber = numberLikeToNumber(request.blockNumber);

   let confirmedTransactionResult = await iqm.getConfirmedTransaction({
      txId: unPrefix0x(request.id),
      numberOfConfirmations,
      blockNumber,
      upperBoundProof: request.dataAvailabilityProof,
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

   let inUtxoNumber = toBN(request.inUtxo).toNumber();
   // if (!fullTxData.sourceAddress?.[inUtxoNumber]) {
   //    return {
   //       status: VerificationStatus.NON_EXISTENT_INPUT_UTXO_ADDRESS
   //    }
   // }

   let result = dbTransaction.paymentReference
      ? processAllInputs(fullTxData, inUtxoNumber)
      : await processSingleInput(client, fullTxData, inUtxoNumber);

   if (result.status != VerificationStatus.NEEDS_MORE_CHECKS) {
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
      sourceAddress: Web3.utils.soliditySha3(result.sourceAddress),
      spentAmount: result.spentAmount,
      paymentReference: prefix0x(paymentReference)
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
   let blockNumber = numberLikeToNumber(request.blockNumber);

   const confirmedBlock = await iqm.getConfirmedBlock({
      upperBoundProof: request.upperBoundProof,
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

export async function utxoBasedReferencedPaymentNonExistence(
   TransactionClass: new (...args: any[]) => UtxoType,
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
      upperBoundProof: request.upperBoundProof,
      roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   });

   let status = verifyWorkflowForReferencedTransactions(referencedTransactionsResponse);
   if (status != VerificationStatus.NEEDS_MORE_CHECKS) {
      return { status }
   }

   // From here on thhese two exist, dbTransactions can be an empty list.
   const dbOverflowBlock = referencedTransactionsResponse.firstOverflowBlock;
   let dbTransactions = referencedTransactionsResponse.transactions;

   // Verify overflow block is confirmed
   status = await verifyConfirmationBlock({
      recheck,
      blockNumber: overflowBlockNumber,
      numberOfConfirmations,
      roundId,
      dataAvailabilityProof: request.upperBoundProof,
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
      
      let totalAmount = toBN(0);
      let destinationHashExists = false;
      for (let output of fullTxData.receivedAmount) {
         const amount = toBN(output.amount);
         const destinationAddressHash = Web3.utils.soliditySha3(output.address);
         if (destinationAddressHash === request.destinationAddress) {
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