//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARReferencedPaymentNonexistence, Attestation, BN, DHReferencedPaymentNonexistence, hashReferencedPaymentNonexistence, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_referenced_payment_nonexistence, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyReferencedPaymentNonexistenceALGO(client: MCC.ALGO, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_referenced_payment_nonexistence) as ARReferencedPaymentNonexistence;
   let roundId = attestation.round.roundId;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   // Search all transactions with provided payment reference


   let response = {
      // This parameters are only shadowed from request
      // FROM HERE
      endTimestamp: request.endTimestamp,
      endBlock: request.endBlock,
      destinationAddress: request.destinationAddress, 
      paymentReference: request.paymentReference,
      amount: request.amount, 
      // TO HERE
      firstCheckedBlock: randSol(request, "firstCheckedBlock", "uint64") as BN,
      firstCheckedBlockTimestamp: randSol(request, "firstCheckedBlockTimestamp", "uint64") as BN,
      firstOverflowBlock: randSol(request, "firstOverflowBlock", "uint64") as BN,
      firstOverflowBlockTimestamp: randSol(request, "firstOverflowBlockTimestamp", "uint64") as BN      
   } as DHReferencedPaymentNonexistence;

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashReferencedPaymentNonexistence(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHReferencedPaymentNonexistence>;
}   
