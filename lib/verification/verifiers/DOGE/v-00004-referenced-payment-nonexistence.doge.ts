//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARReferencedPaymentNonexistence, BN, DHReferencedPaymentNonexistence, IndexedQueryManager, parseRequestBytes, randSol, RPCInterface, TDEF_referenced_payment_nonexistence, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyReferencedPaymentNonexistenceDOGE(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF_referenced_payment_nonexistence) as ARReferencedPaymentNonexistence;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

// XXXX

   //-$$$<end> of the custom section. Do not change this comment.

   let response = {
      endTimestamp: randSol(request, "endTimestamp", "uint64") as BN,
      endBlock: randSol(request, "endBlock", "uint64") as BN,
      destinationAddress: randSol(request, "destinationAddress", "bytes32") as string,
      paymentReference: randSol(request, "paymentReference", "uint128") as BN,
      amount: randSol(request, "amount", "uint128") as BN,
      firstCheckedBlock: randSol(request, "firstCheckedBlock", "uint64") as BN,
      firstCheckedBlockTimestamp: randSol(request, "firstCheckedBlockTimestamp", "uint64") as BN,
      firstOverflowBlock: randSol(request, "firstOverflowBlock", "uint64") as BN,
      firstOverflowBlockTimestamp: randSol(request, "firstOverflowBlockTimestamp", "uint64") as BN      
   } as DHReferencedPaymentNonexistence;

   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint64",		// endTimestamp
         "uint64",		// endBlock
         "bytes32",		// destinationAddress
         "uint128",		// paymentReference
         "uint128",		// amount
         "uint64",		// firstCheckedBlock
         "uint64",		// firstCheckedBlockTimestamp
         "uint64",		// firstOverflowBlock
         "uint64",		// firstOverflowBlockTimestamp
      ],
      [
         response.endTimestamp,
         response.endBlock,
         response.destinationAddress,
         response.paymentReference,
         response.amount,
         response.firstCheckedBlock,
         response.firstCheckedBlockTimestamp,
         response.firstOverflowBlock,
         response.firstOverflowBlockTimestamp
      ]
   );   

   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHReferencedPaymentNonexistence>;
}   
