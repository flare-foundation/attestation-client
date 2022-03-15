//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequestBytes, randSol, RPCInterface, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";
import { numberLikeToNumber } from "../../attestation-types/attestation-types-helpers";
import { AlgoTransaction, IAlgoBlockData, IAlgoGetTransactionRes, toBN } from "flare-mcc";

const web3 = new Web3();

export async function verifyPaymentALGO(client: MCC.ALGO, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_payment) as ARPayment;
   let roundId = attestation.round.roundId;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await indexer.checkTransactionExistence({
      txId: request.id,
      blockNumber: numberLikeToNumber(request.blockNumber),
      dataAvailability: request.dataAvailabilityProof,
      roundId: roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   })

   if (result.status === 'RECHECK') {
      return {
         status: VerificationStatus.RECHECK_LATER
      } as Verification<DHPayment>;
   }

   if (result.status === 'NOT_EXIST' || !result.transaction) {
      return {
         status: VerificationStatus.NON_EXISTENT_TRANSACTION
      }
   }

   const fullTxData = new AlgoTransaction(JSON.parse(result.transaction.response))

   if(fullTxData.sourceAddress.length !== 1){
      return {
         status: VerificationStatus.NOT_SINGLE_SOURCE_ADDRESS
      }
   }

   if(fullTxData.receivingAddress.length !== 1){
      return {
         status: VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS
      }
   }

   if(fullTxData.reference.length !== 1){
      return {
         status: VerificationStatus.NOT_SINGLE_PAYMENT_REFERENCE
      }
   }

   let response = {
      blockNumber: toBN(result.transaction.blockNumber),
      blockTimestamp: toBN(result.transaction.timestamp),
      transactionHash: result.transaction.transactionId,
      utxo: toBN(0), // 0 For non Utxo chains
      sourceAddress: fullTxData.sourceAddress[0],
      receivingAddress: fullTxData.receivingAddress[0],
      paymentReference: fullTxData.reference[0], 
      spentAmount: toBN(fullTxData.spendAmount),
      receivedAmount: toBN(fullTxData.receivedAmount),
      oneToOne: true,
      status: toBN(0)     
   } as DHPayment;


   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashPayment(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHPayment>;
}   
