//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequestBytes, randSol, RPCInterface, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";
import { numberLikeToNumber } from "../../attestation-types/attestation-types-helpers";

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

   if (result.status === 'NOT_EXIST') {
      return {
         status: VerificationStatus.NON_EXISTENT_TRANSACTION
      }
   }
   

   //-$$$<end> of the custom section. Do not change this comment.

   let response = {
      blockNumber: randSol(request, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN,
      transactionHash: randSol(request, "transactionHash", "bytes32") as string,
      utxo: randSol(request, "utxo", "uint8") as BN,
      sourceAddress: randSol(request, "sourceAddress", "bytes32") as string,
      receivingAddress: randSol(request, "receivingAddress", "bytes32") as string,
      paymentReference: randSol(request, "paymentReference", "uint256") as BN,
      spentAmount: randSol(request, "spentAmount", "int256") as BN,
      receivedAmount: randSol(request, "receivedAmount", "uint256") as BN,
      oneToOne: randSol(request, "oneToOne", "bool") as boolean,
      status: randSol(request, "status", "uint8") as BN      
   } as DHPayment;

   let hash = hashPayment(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHPayment>;
}   
