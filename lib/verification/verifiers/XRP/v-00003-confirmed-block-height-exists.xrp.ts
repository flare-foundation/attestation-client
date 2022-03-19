//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARConfirmedBlockHeightExists, Attestation, BN, DHConfirmedBlockHeightExists, hashConfirmedBlockHeightExists, IndexedQueryManager, MCC, parseRequest, randSol, TDEF_confirmed_block_height_exists, Verification, VerificationStatus, Web3 } from "./0imports";
import { accountBasedConfirmedBlockHeightExistsVerification } from "../../verification-utils";

const web3 = new Web3();

export async function verifyConfirmedBlockHeightExistsXRP(
   client: MCC.XRP, 
   attestation: Attestation, 
   indexer: IndexedQueryManager, 
   recheck = false
): Promise<Verification<ARConfirmedBlockHeightExists, DHConfirmedBlockHeightExists>>
{
   let request = parseRequest(attestation.data.request) as ARConfirmedBlockHeightExists;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await accountBasedConfirmedBlockHeightExistsVerification(request, roundId, numberOfConfirmations, recheck, indexer);
   if (result.status != VerificationStatus.OK) {
      return { status: result.status }
   }

   let response = result.response;   

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashConfirmedBlockHeightExists(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   }
}   
