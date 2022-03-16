//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARBalanceDecreasingTransaction, Attestation, BN, DHBalanceDecreasingTransaction, hashBalanceDecreasingTransaction, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_balance_decreasing_transaction, Verification, VerificationStatus, Web3 } from "./0imports";
import { AlgoTransaction, toBN } from "flare-mcc";
import { numberLikeToNumber } from "../../attestation-types/attestation-types-helpers";

const web3 = new Web3();

export async function verifyBalanceDecreasingTransactionALGO(client: MCC.ALGO, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_balance_decreasing_transaction) as ARBalanceDecreasingTransaction;
   let roundId = attestation.round.roundId;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await indexer.getConfirmedTransaction({
      txId: request.id,
      blockNumber: numberLikeToNumber(request.blockNumber),  // We need different transaction existence query 
      dataAvailability: request.dataAvailabilityProof,
      roundId: roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   })

   if (result.status === 'RECHECK') {
      return {
         status: VerificationStatus.RECHECK_LATER
      } as Verification<DHBalanceDecreasingTransaction>;
   }

   if (result.status === 'NOT_EXIST' || !result.transaction) {
      return {
         status: VerificationStatus.NON_EXISTENT_TRANSACTION
      } as Verification<DHBalanceDecreasingTransaction>
   }

   const fullTxData = new AlgoTransaction(JSON.parse(result.transaction.response))

   const sourceAddress = fullTxData.sourceAddress.length === 1 ? fullTxData.sourceAddress[0] : ""
   const paymentReference = fullTxData.reference.length === 1 ? fullTxData.reference[0] : ""
   

   // Check 
   let response = {
      blockNumber: toBN(result.transaction.blockNumber),
      blockTimestamp: toBN(result.transaction.timestamp),
      transactionHash: result.transaction.transactionId,
      sourceAddress: sourceAddress, 
      spentAmount: toBN(fullTxData.spendAmount),
      paymentReference: paymentReference     
   } as DHBalanceDecreasingTransaction;

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashBalanceDecreasingTransaction(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBalanceDecreasingTransaction>;
}   
