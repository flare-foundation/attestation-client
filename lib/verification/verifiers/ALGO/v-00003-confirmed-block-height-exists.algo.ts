//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARConfirmedBlockHeightExists, Attestation, BN, DHConfirmedBlockHeightExists, hashConfirmedBlockHeightExists, IndexedQueryManager, MCC, parseRequestBytes, randSol, TDEF_confirmed_block_height_exists, Verification, VerificationStatus, Web3 } from "./0imports";
import { numberLikeToNumber } from "../../attestation-types/attestation-types-helpers";
import { toBN } from "flare-mcc";
import { BlockNumberQueryRequest } from "../../../indexed-query-manager/indexed-query-manager-types";

const web3 = new Web3();

export async function verifyConfirmedBlockHeightExistsALGO(client: MCC.ALGO, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_confirmed_block_height_exists) as ARConfirmedBlockHeightExists;
   let roundId = attestation.round.roundId;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   const blockQueryParams : BlockNumberQueryRequest = {
      dataAvailability: request.dataAvailabilityProof,
      blockNumber: numberLikeToNumber(request.blockNumber),
      roundId: roundId,
      type: recheck ? 'RECHECK' : 'FIRST_CHECK'
   }

   // We check that block with specified hash exist at specified height
   const result = await indexer.getConfirmedBlock(blockQueryParams)

   if (result.status === 'RECHECK') {
      return {
         status: VerificationStatus.RECHECK_LATER
      } as Verification<DHConfirmedBlockHeightExists>;
   }

   if(result.status === 'NOT_EXIST' || !result.block){
      return {
         status: VerificationStatus.BLOCK_HASH_DOES_NOT_EXIST
      }
   }

   let response = {   
      stateConnectorRound: roundId,
      blockNumber: toBN(result.block.blockNumber),
      blockTimestamp: toBN(result.block.timestamp)   
   } as DHConfirmedBlockHeightExists;

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashConfirmedBlockHeightExists(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHConfirmedBlockHeightExists>;
}   
