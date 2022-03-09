//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARBalanceDecreasingTransaction, BN, DHBalanceDecreasingTransaction, IndexedQueryManager, parseRequestBytes, randSol, RPCInterface, TDEF_balance_decreasing_transaction, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyBalanceDecreasingTransactionDOGE(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF_balance_decreasing_transaction) as ARBalanceDecreasingTransaction;

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

   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint64",		// blockNumber
         "uint64",		// blockTimestamp
         "bytes32",		// transactionHash
         "bytes32",		// sourceAddress
         "int256",		// spentAmount
         "uint256",		// paymentReference
      ],
      [
         response.blockNumber,
         response.blockTimestamp,
         response.transactionHash,
         response.sourceAddress,
         response.spentAmount,
         response.paymentReference
      ]
   );   

   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBalanceDecreasingTransaction>;
}   
