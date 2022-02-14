
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { RPCInterface } from "flare-mcc";
import { SourceIndexer } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00003-block-height-existence";
import { ARBlockHeightExistence } from "../../generated/attestation-request-types";

export function verifyBlockHeightExistenceLTC(client: RPCInterface, bytes: string, indexer: SourceIndexer) {
   let request = parseRequestBytes(bytes, TDEF) as ARBlockHeightExistence;
   let response = {
         attestationType: (request as any).attestationType 
            ? (request as any).attestationType as BN 
            : randSol("uint16") as BN,
         chainId: (request as any).chainId 
            ? (request as any).chainId as BN 
            : randSol("uint16") as BN,
         blockNumber: (request as any).blockNumber 
            ? (request as any).blockNumber as BN 
            : randSol("uint64") as BN,
         blockTimestamp: (request as any).blockTimestamp 
            ? (request as any).blockTimestamp as BN 
            : randSol("uint64") as BN,
         blockHash: (request as any).blockHash 
            ? (request as any).blockHash as string 
            : randSol("bytes32") as string      
   }
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint16",		// attestationType
           "uint16",		// chainId
           "uint64",		// blockNumber
           "uint64",		// blockTimestamp
           "bytes32",		// blockHash
      ],
      [
          response.attestationType,
          response.chainId,
          response.blockNumber,
          response.blockTimestamp,
          response.blockHash
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
}   
