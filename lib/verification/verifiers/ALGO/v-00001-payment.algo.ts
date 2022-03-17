//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { AlgoTransaction } from "flare-mcc";
import { accountBasedPaymentVerification } from "../../verification-utils";
import { ARPayment, Attestation, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequestBytes, TDEF_payment, Verification, VerificationStatus, Web3 } from "./0imports";

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
   

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashPayment(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   }
}   
