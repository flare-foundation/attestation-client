//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARBlockHeightExists, Attestation, BN, DHBlockHeightExists, hashBlockHeightExists, IndexedQueryManager, MCC, parseRequestBytes, randSol, RPCInterface, TDEF_block_height_exists, Verification, VerificationStatus, Web3 } from "./0imports";
import { toBN } from "flare-mcc";
import { BlockHashQueryRequest } from "../../../indexed-query-manager/IndexedQueryManager";
import { numberLikeToNumber } from "../../attestation-types/attestation-types-helpers";

const web3 = new Web3();

export async function verifyBlockHeightExistsALGO(client: MCC.ALGO, attestation: Attestation, indexer: IndexedQueryManager, recheck = false) {
   let request = parseRequestBytes(attestation.data.request, TDEF_block_height_exists) as ARBlockHeightExists;
   let roundId = attestation.round.roundId;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   const blockQueryParams : BlockHashQueryRequest = {
      hash: request.dataAvailabilityProof,
      roundId: numberLikeToNumber(request.blockNumber)
   }

   // We check that block with specified hash exist at specified height
   const query = await indexer.getBlockByHash(blockQueryParams)

   if(query.status === 'NOT_EXIST'){
      return {
         status: VerificationStatus.BLOCK_HASH_DOES_NOT_EXIST
      }
   }

   let response = {   
      stateConnectorRound: roundId,
      blockNumber: toBN(query.block?.blockNumber),
      blockTimestamp: toBN(query.block?.timestamp)   
   } as DHBlockHeightExists;

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashBlockHeightExists(request, response);

   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBlockHeightExists>;
}   
