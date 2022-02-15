
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { SourceIndexer, Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00004-referenced-payment-non-existence";
import { ARReferencedPaymentNonExistence } from "../../generated/attestation-request-types";
import { DHReferencedPaymentNonExistence } from "../../generated/attestation-hash-types";
const web3 = new Web3();

export function verifyReferencedPaymentNonExistenceXRP(client: RPCInterface, bytes: string, indexer: SourceIndexer) {
   let request = parseRequestBytes(bytes, TDEF) as ARReferencedPaymentNonExistence;

   // Do the magic here and fill the response with the relevant data

   let response = {
         attestationType: randSol(request, "attestationType", "uint16") as BN,
         chainId: randSol(request, "chainId", "uint16") as BN,
         endTimestamp: randSol(request, "endTimestamp", "uint64") as BN,
         endBlock: randSol(request, "endBlock", "uint64") as BN,
         paymentReference: randSol(request, "paymentReference", "uint128") as BN,
         amount: randSol(request, "amount", "uint128") as BN,
         firstCheckedBlockTimestamp: randSol(request, "firstCheckedBlockTimestamp", "uint64") as BN,
         firstCheckedBlock: randSol(request, "firstCheckedBlock", "uint64") as BN,
         firstOverflowBlockTimestamp: randSol(request, "firstOverflowBlockTimestamp", "uint64") as BN,
         firstOverflowBlock: randSol(request, "firstOverflowBlock", "uint64") as BN      
   } as DHReferencedPaymentNonExistence;
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
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHReferencedPaymentNonExistence>;
}   
