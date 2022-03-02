//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { IndexerQueryHandler, Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00003-block-height-exists";
import { ARBlockHeightExists } from "../../generated/attestation-request-types";
import { DHBlockHeightExists } from "../../generated/attestation-hash-types";
const web3 = new Web3();

export async function verifyBlockHeightExistsDOGE(client: RPCInterface, bytes: string, indexer: IndexerQueryHandler) {
   let request = parseRequestBytes(bytes, TDEF) as ARBlockHeightExists;

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
