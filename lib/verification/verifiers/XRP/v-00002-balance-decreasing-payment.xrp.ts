
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { RPCInterface } from "flare-mcc";
import { SourceIndexer } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00002-balance-decreasing-payment";
import { ARBalanceDecreasingPayment } from "../../generated/attestation-request-types";

export function verifyBalanceDecreasingPaymentXRP(client: RPCInterface, bytes: string, indexer: SourceIndexer) {
   let request = parseRequestBytes(bytes, TDEF) as ARBalanceDecreasingPayment;
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
         txId: (request as any).txId 
            ? (request as any).txId as string 
            : randSol("bytes32") as string,
         sourceAddress: (request as any).sourceAddress 
            ? (request as any).sourceAddress as string 
            : randSol("string") as string,
         spent: (request as any).spent 
            ? (request as any).spent as BN 
            : randSol("int256") as BN      
   }
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint16",		// attestationType
           "uint16",		// chainId
           "uint64",		// blockNumber
           "uint64",		// blockTimestamp
           "bytes32",		// txId
           "string",		// sourceAddress
           "int256",		// spent
      ],
      [
          response.attestationType,
          response.chainId,
          response.blockNumber,
          response.blockTimestamp,
          response.txId,
          response.sourceAddress,
          response.spent
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
}   
