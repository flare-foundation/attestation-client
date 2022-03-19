//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARReferencedPaymentNonexistence, Attestation, BN, DHReferencedPaymentNonexistence, hashReferencedPaymentNonexistence, IndexedQueryManager, MCC, parseRequest, randSol, TDEF_referenced_payment_nonexistence, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyReferencedPaymentNonexistenceDOGE(
   client: MCC.DOGE, 
   attestation: Attestation, 
   indexer: IndexedQueryManager, 
   recheck = false
): Promise<Verification<ARReferencedPaymentNonexistence, DHReferencedPaymentNonexistence>>
{
   let request = parseRequest(attestation.data.request) as ARReferencedPaymentNonexistence;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

// XXXX

   //-$$$<end> of the custom section. Do not change this comment.

   let response = {
      endTimestamp: randSol(request, "endTimestamp", "uint64") as BN,
      endBlock: randSol(request, "endBlock", "uint64") as BN,
      destinationAddress: randSol(request, "destinationAddress", "bytes32") as string,
      paymentReference: randSol(request, "paymentReference", "bytes32") as string,
      amount: randSol(request, "amount", "uint128") as BN,
      firstCheckedBlock: randSol(request, "firstCheckedBlock", "uint64") as BN,
      firstCheckedBlockTimestamp: randSol(request, "firstCheckedBlockTimestamp", "uint64") as BN,
      firstOverflowBlock: randSol(request, "firstOverflowBlock", "uint64") as BN,
      firstOverflowBlockTimestamp: randSol(request, "firstOverflowBlockTimestamp", "uint64") as BN      
   } as DHReferencedPaymentNonexistence;

   let hash = hashReferencedPaymentNonexistence(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   }
}   
