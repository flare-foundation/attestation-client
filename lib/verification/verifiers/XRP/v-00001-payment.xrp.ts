//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";
import { toBN } from "flare-mcc/dist/utils/utils";
import { Payment, TransactionMetadata, TxResponse } from "xrpl";
import { numberLikeToNumber } from "../../attestation-types/attestation-types-helpers";
import { XrpTransaction } from "flare-mcc";

const web3 = new Web3();

export async function verifyPaymentXRP(client: MCC.XRP, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_payment) as ARPayment;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   // TODO: pass 
   let blockNumber = numberLikeToNumber(request.blockNumber);
   let result = await indexer.getConfirmedTransaction({
      txId: request.id,
      numberOfConfirmations,
      blockNumber: numberLikeToNumber(request.blockNumber),
      dataAvailabilityProof: request.dataAvailabilityProof,
      roundId: roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   })

   if (result.status === 'RECHECK') {
      return {
         status: VerificationStatus.RECHECK_LATER
      } as Verification<ARPayment, DHPayment>;
   }

   if (result.status === 'NOT_EXIST') {
      return {
         status: VerificationStatus.NON_EXISTENT_TRANSACTION
      }
   }

   const fullTxData = new XrpTransaction(JSON.parse(result.transaction.response))
   // let fullTxData = JSON.parse(result.transaction.response) as TxResponse;

   let metaData: TransactionMetadata = fullTxData.data.result.meta || (fullTxData.data.result as any).metaData;
   // let fee = toBN(fullTxData.result.Fee!);
   let fee = fullTxData.fee;

   if (recheck) {
      let confirmationBlockIndex = blockNumber + numberOfConfirmations;
      let confirmationBlock = await indexer.queryBlock({
         blockNumber: confirmationBlockIndex,
         roundId
      });
      if (!confirmationBlock) {
         return {
            status: VerificationStatus.NOT_CONFIRMED
         }
      }
      if (confirmationBlock.blockHash != request.dataAvailabilityProof) {
         return {
            status: VerificationStatus.WRONG_DATA_AVAILABILITY_PROOF
         }
      }
   }

   if (fullTxData.data.result.TransactionType != "Payment") {
      return {
         status: VerificationStatus.NOT_PAYMENT
      }
   }

   // Transaction is Payment
   let delivered = toBN(metaData.delivered_amount as string); // XRP in drops

   let status = this.client.getTransactionStatus(fullTxData.data);

   let payment = fullTxData.data.result as Payment;
   let response = {
      stateConnectorRound: roundId,
      blockNumber: toBN(blockNumber),
      blockTimestamp: toBN(result.transaction.timestamp),
      transactionHash: result.transaction.transactionId,
      utxo: toBN(0),
      sourceAddress: fullTxData.sourceAddress[0],
      receivingAddress: fullTxData.receivingAddress[0], // Payment has unique destination
      paymentReference: fullTxData.reference.length === 1 ? fullTxData.reference[0]: "",  // TODO
      spentAmount: fullTxData.spentAmount[0].amount,
      receivedAmount: fullTxData.receivedAmount[0].amount,
      oneToOne: true,
      status: toBN(status)
   } as DHPayment;

   //-$$$<end> of the custom section. Do not change this comment.

   let hash = hashPayment(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   } as Verification<ARPayment, DHPayment>;
}   
