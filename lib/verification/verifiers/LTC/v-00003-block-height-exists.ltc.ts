//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARBlockHeightExists, BN, DHBlockHeightExists, IndexedQueryManager, parseRequestBytes, randSol, RPCInterface, TDEF_block_height_exists, Verification, VerificationStatus, Web3 } from "./0imports";


const web3 = new Web3();

export async function verifyBlockHeightExistsLTC(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF_block_height_exists) as ARBlockHeightExists;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

// XXXX

   //-$$$<end> of the custom section. Do not change this comment.

   let response = {
      blockNumber: randSol(request, "blockNumber", "uint64") as BN,
      blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN      
   } as DHBlockHeightExists;

   let encoded = web3.eth.abi.encodeParameters(
      [
         "uint16",
         "uint32",
         "uint64",		// blockNumber
         "uint64",		// blockTimestamp
      ],
      [
         response.attestationType,
         response.chainId,
         response.blockNumber,
         response.blockTimestamp
      ]
   );   

   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBlockHeightExists>;
}   
