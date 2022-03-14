//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARBalanceDecreasingTransaction, Attestation, BN, DHBalanceDecreasingTransaction, hashBalanceDecreasingTransaction, IndexedQueryManager, MCC, parseRequestBytes, randSol, RPCInterface, TDEF_balance_decreasing_transaction, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyBalanceDecreasingTransactionLTC(client: MCC.LTC, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_balance_decreasing_transaction) as ARBalanceDecreasingTransaction;
   let roundId = attestation.round.roundId;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

// XXXX

   //-$$$<end> of the custom section. Do not change this comment.

   let response = {
      blockNumber: randSol(request, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN,
      transactionHash: randSol(request, "transactionHash", "bytes32") as string,
      sourceAddress: randSol(request, "sourceAddress", "bytes32") as string,
      spentAmount: randSol(request, "spentAmount", "int256") as BN,
      paymentReference: randSol(request, "paymentReference", "uint256") as BN      
   } as DHBalanceDecreasingTransaction;

   let hash = hashBalanceDecreasingTransaction(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBalanceDecreasingTransaction>;
}   
