//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";
import { AlgoTransaction } from "flare-mcc";
import { accountBasedPaymentVerification } from "../../verification-utils";

const web3 = new Web3();

export async function verifyPaymentALGO(
   client: MCC.ALGO, 
   attestation: Attestation, 
   indexer: IndexedQueryManager, 
   recheck = false
): Promise<Verification<ARPayment, DHPayment>>
{
   let request = parseRequestBytes(attestation.data.request, TDEF_payment) as ARPayment;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await accountBasedPaymentVerification(AlgoTransaction, request, roundId, numberOfConfirmations, recheck, indexer);
   if (result.status != VerificationStatus.OK) {
      return { status: result.status }
   }

   let response = result.response;   
   
   // const transactionData = JSON.parse(result.transaction.response)
   // const fullTxData = new AlgoTransaction(transactionData.data, transactionData.additionalData)

   // if(fullTxData.sourceAddress.length !== 1){
   //    return {
   //       status: VerificationStatus.NOT_SINGLE_SOURCE_ADDRESS
   //    }
   // }

   // if(fullTxData.receivingAddress.length !== 1){
   //    return {
   //       status: VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS
   //    }
   // }

   // if(fullTxData.reference.length !== 1){
   //    return {
   //       status: VerificationStatus.NOT_SINGLE_PAYMENT_REFERENCE
   //    }
   // }

   // let response = {
   //    blockNumber: toBN(result.transaction.blockNumber),
   //    blockTimestamp: toBN(result.transaction.timestamp),
   //    transactionHash: result.transaction.transactionId,
   //    utxo: toBN(0), // 0 For non Utxo chains
   //    sourceAddress: fullTxData.sourceAddress[0],
   //    receivingAddress: fullTxData.receivingAddress[0],
   //    paymentReference: fullTxData.reference[0], 
   //    spentAmount: fullTxData.spentAmount[0].amount,
   //    receivedAmount: fullTxData.receivedAmount[0].amount,
   //    oneToOne: true,
   //    status: toBN(0)     
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
