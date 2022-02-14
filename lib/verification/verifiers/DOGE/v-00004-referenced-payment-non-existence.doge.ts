
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { RPCInterface } from "flare-mcc";
import { SourceIndexer } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00004-referenced-payment-non-existence";
import { ARReferencedPaymentNonExistence } from "../../generated/attestation-request-types";

export function verifyReferencedPaymentNonExistenceDOGE(client: RPCInterface, bytes: string, indexer: SourceIndexer) {
   let request = parseRequestBytes(bytes, TDEF) as ARReferencedPaymentNonExistence;
   let response = {
         attestationType: (request as any).attestationType 
            ? (request as any).attestationType as BN 
            : randSol("uint16") as BN,
         chainId: (request as any).chainId 
            ? (request as any).chainId as BN 
            : randSol("uint16") as BN,
         endTimestamp: (request as any).endTimestamp 
            ? (request as any).endTimestamp as BN 
            : randSol("uint64") as BN,
         endBlock: (request as any).endBlock 
            ? (request as any).endBlock as BN 
            : randSol("uint64") as BN,
         paymentReference: (request as any).paymentReference 
            ? (request as any).paymentReference as BN 
            : randSol("uint128") as BN,
         amount: (request as any).amount 
            ? (request as any).amount as BN 
            : randSol("uint128") as BN,
         firstCheckedBlockTimestamp: (request as any).firstCheckedBlockTimestamp 
            ? (request as any).firstCheckedBlockTimestamp as BN 
            : randSol("uint64") as BN,
         firstCheckedBlock: (request as any).firstCheckedBlock 
            ? (request as any).firstCheckedBlock as BN 
            : randSol("uint64") as BN,
         firstOverflowBlockTimestamp: (request as any).firstOverflowBlockTimestamp 
            ? (request as any).firstOverflowBlockTimestamp as BN 
            : randSol("uint64") as BN,
         firstOverflowBlock: (request as any).firstOverflowBlock 
            ? (request as any).firstOverflowBlock as BN 
            : randSol("uint64") as BN      
   }
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint16",		// attestationType
           "uint16",		// chainId
           "uint64",		// endTimestamp
           "uint64",		// endBlock
           "uint128",		// paymentReference
           "uint128",		// amount
           "uint64",		// firstCheckedBlockTimestamp
           "uint64",		// firstCheckedBlock
           "uint64",		// firstOverflowBlockTimestamp
           "uint64",		// firstOverflowBlock
      ],
      [
          response.attestationType,
          response.chainId,
          response.endTimestamp,
          response.endBlock,
          response.paymentReference,
          response.amount,
          response.firstCheckedBlockTimestamp,
          response.firstCheckedBlock,
          response.firstOverflowBlockTimestamp,
          response.firstOverflowBlock
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
}   
