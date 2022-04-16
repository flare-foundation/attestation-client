//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequest, randSol, Verification, VerificationStatus, Web3 } from "./0imports";
import { DogeTransaction } from "flare-mcc";
import { verifyPayment } from "../../verification-utils/generic-chain-verifications";

const web3 = new Web3();

export async function verifyPaymentDOGE(
   client: MCC.DOGE, 
   attestation: Attestation, 
   indexer: IndexedQueryManager, 
   recheck = false
): Promise<Verification<ARPayment, DHPayment>>
{
   let request = parseRequest(attestation.data.request) as ARPayment;
   let roundId = attestation.roundId;
   let numberOfConfirmations = attestation.numberOfConfirmationBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await verifyPayment(DogeTransaction, request, roundId, numberOfConfirmations, recheck, indexer, client);
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
