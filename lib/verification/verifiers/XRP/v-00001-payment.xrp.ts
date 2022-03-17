//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";
import { XrpTransaction } from "flare-mcc";
import { accountBasedPaymentVerification } from "../../verification-utils";

const web3 = new Web3();

export async function verifyPaymentXRP(
   client: MCC.XRP, 
   attestation: Attestation, 
   indexer: IndexedQueryManager, 
   recheck = false
): Promise<Verification<ARPayment, DHPayment>>
{
   let request = parseRequestBytes(attestation.data.request, TDEF_payment) as ARPayment;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await accountBasedPaymentVerification(XrpTransaction, request, roundId, numberOfConfirmations, recheck, indexer);
   if (result.status != VerificationStatus.OK) {
      return { status: result.status }
   }

   let response = result.response;   
   // let dbTransaction = confirmedTransactionResult.transaction!;
   // const transactionData = JSON.parse(dbTransaction.response)
   // const fullTxData = new XrpTransaction(transactionData.data, transactionData.additionalData)

   // if (recheck) {
   //    let confirmationBlockIndex = blockNumber + numberOfConfirmations;
   //    let confirmationBlock = await indexer.queryBlock({
   //       blockNumber: confirmationBlockIndex,
   //       roundId
   //    });
   //    if (!confirmationBlock) {
   //       return {
   //          status: VerificationStatus.NOT_CONFIRMED
   //       }
   //    }
   //    if (confirmationBlock.blockHash != request.dataAvailabilityProof) {
   //       return {
   //          status: VerificationStatus.WRONG_DATA_AVAILABILITY_PROOF
   //       }
   //    }
   // }

   // if (fullTxData.data.result.TransactionType != "Payment") {
   //    return {
   //       status: VerificationStatus.NOT_PAYMENT
   //    }
   // }

   // let status = toBN(fullTxData.successStatus);

   // let response = {
   //    stateConnectorRound: roundId,
   //    blockNumber: toBN(blockNumber),
   //    blockTimestamp: toBN(dbTransaction.timestamp),
   //    transactionHash: dbTransaction.transactionId,
   //    utxo: toBN(0),
   //    sourceAddress: fullTxData.sourceAddress[0],
   //    receivingAddress: fullTxData.receivingAddress[0],
   //    paymentReference: fullTxData.reference.length === 1 ? fullTxData.reference[0]: "", 
   //    spentAmount: fullTxData.spentAmount[0].amount,
   //    receivedAmount: fullTxData.receivedAmount[0].amount,
   //    oneToOne: true,
   //    status: status
   // } as DHPayment;

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashPayment(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   }
}   
