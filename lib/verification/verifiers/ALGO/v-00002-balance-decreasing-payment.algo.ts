
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { IndexerQueryHandler, Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00002-balance-decreasing-payment";
import { ARBalanceDecreasingPayment } from "../../generated/attestation-request-types";
import { DHBalanceDecreasingPayment } from "../../generated/attestation-hash-types";
const web3 = new Web3();

export async function verifyBalanceDecreasingPaymentALGO(client: RPCInterface, bytes: string, indexer: IndexerQueryHandler) {
   let request = parseRequestBytes(bytes, TDEF) as ARBalanceDecreasingPayment;

   // Do the magic here and fill the response with the relevant data

   let response = {
         attestationType: randSol(request, "attestationType", "uint16") as BN,
         chainId: randSol(request, "chainId", "uint16") as BN,
         blockNumber: randSol(request, "blockNumber", "uint64") as BN,
         blockTimestamp: randSol(request, "blockTimestamp", "uint64") as BN,
         txId: randSol(request, "txId", "bytes32") as string,
         sourceAddress: randSol(request, "sourceAddress", "string") as string,
         spent: randSol(request, "spent", "int256") as BN      
   } as DHBalanceDecreasingPayment;
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
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHBalanceDecreasingPayment>;
}   
