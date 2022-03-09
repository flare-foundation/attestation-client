//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ARBlockHeightExists, BN, DHBlockHeightExists, IndexedQueryManager, parseRequestBytes, randSol, RPCInterface, TDEF_block_height_exists, Verification, VerificationStatus, Web3 } from "./0imports";

const web3 = new Web3();

export async function verifyBlockHeightExistsLTC(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF_block_height_exists) as ARBlockHeightExists;

   // Do the magic here and fill the response with the relevant data

   let response = {
         blockNumber: randSol(request, "blockNumber", "uint64") as BN,
         blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN      
   } as DHBlockHeightExists;
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint64",		// blockNumber
           "uint64",		// blockTimestamp
      ],
      [
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
