//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARConfirmedBlockHeightExists, Attestation, BN, DHConfirmedBlockHeightExists, hashConfirmedBlockHeightExists, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_confirmed_block_height_exists, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyConfirmedBlockHeightExistsBTC(client: MCC.BTC, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_confirmed_block_height_exists) as ARConfirmedBlockHeightExists;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

// TYPE THE CODE HERE

   //-$$$<end> of the custom section. Do not change this comment.

   let response = {
      blockNumber: randSol(request, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN      
   } as DHConfirmedBlockHeightExists;

   let hash = hashConfirmedBlockHeightExists(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   } as Verification<ARConfirmedBlockHeightExists, DHConfirmedBlockHeightExists>;
}   
