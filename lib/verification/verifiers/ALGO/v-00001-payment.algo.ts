
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { SourceIndexer, Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00001-payment";
import { ARPayment } from "../../generated/attestation-request-types";
import { DHPayment } from "../../generated/attestation-hash-types";
const web3 = new Web3();

export function verifyPaymentALGO(client: RPCInterface, bytes: string, indexer: SourceIndexer) {
   let request = parseRequestBytes(bytes, TDEF) as ARPayment;

   // Do the magic here and fill the response with the relevant data

   let response = {
         attestationType: randSol(request, "attestationType", "uint16") as BN,
         chainId: randSol(request, "chainId", "uint16") as BN,
         blockNumber: randSol(request, "blockNumber", "uint64") as BN,
         blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN,
         txId: randSol(request, "txId", "bytes32") as string,
         utxo: randSol(request, "utxo", "uint8") as BN,
         sourceAddress: randSol(request, "sourceAddress", "string") as string,
         destinationAddress: randSol(request, "destinationAddress", "string") as string,
         paymentReference: randSol(request, "paymentReference", "uint128") as BN,
         spent: randSol(request, "spent", "int256") as BN,
         delivered: randSol(request, "delivered", "uint256") as BN,
         isToOne: randSol(request, "isToOne", "bool") as boolean,
         status: randSol(request, "status", "uint8") as BN      
   } as DHPayment;
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
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHPayment>;
}   
