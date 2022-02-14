
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { RPCInterface } from "flare-mcc";
import { SourceIndexer } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00001-payment";
import { ARPayment } from "../../generated/attestation-request-types";

export function verifyPaymentXRP(client: RPCInterface, bytes: string, indexer: SourceIndexer) {
   let request = parseRequestBytes(bytes, TDEF) as ARPayment;
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
         utxo: (request as any).utxo 
            ? (request as any).utxo as BN 
            : randSol("uint8") as BN,
         sourceAddress: (request as any).sourceAddress 
            ? (request as any).sourceAddress as string 
            : randSol("string") as string,
         destinationAddress: (request as any).destinationAddress 
            ? (request as any).destinationAddress as string 
            : randSol("string") as string,
         paymentReference: (request as any).paymentReference 
            ? (request as any).paymentReference as BN 
            : randSol("uint128") as BN,
         spent: (request as any).spent 
            ? (request as any).spent as BN 
            : randSol("int256") as BN,
         delivered: (request as any).delivered 
            ? (request as any).delivered as BN 
            : randSol("uint256") as BN,
         isToOne: (request as any).isToOne 
            ? (request as any).isToOne as boolean 
            : randSol("bool") as boolean,
         status: (request as any).status 
            ? (request as any).status as BN 
            : randSol("uint8") as BN      
   }
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint16",		// attestationType
           "uint16",		// chainId
           "uint64",		// blockNumber
           "uint64",		// blockTimestamp
           "bytes32",		// txId
           "uint8",		// utxo
           "string",		// sourceAddress
           "string",		// destinationAddress
           "uint128",		// paymentReference
           "int256",		// spent
           "uint256",		// delivered
           "bool",		// isToOne
           "uint8",		// status
      ],
      [
          response.attestationType,
          response.chainId,
          response.blockNumber,
          response.blockTimestamp,
          response.txId,
          response.utxo,
          response.sourceAddress,
          response.destinationAddress,
          response.paymentReference,
          response.spent,
          response.delivered,
          response.isToOne,
          response.status
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
}   
