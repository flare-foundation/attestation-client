//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import BN from "bn.js";
import Web3 from "web3";   
import { RPCInterface } from "flare-mcc";
import { Verification, VerificationStatus } from "../../attestation-types/attestation-types";
import { parseRequestBytes, randSol } from "../../attestation-types/attestation-types-helpers";
import { TDEF } from "../../attestation-types/t-00004-referenced-payment-nonexistence";
import { ARReferencedPaymentNonexistence } from "../../generated/attestation-request-types";
import { DHReferencedPaymentNonexistence } from "../../generated/attestation-hash-types";
import { IndexedQueryManager } from "../../../indexed-query-manager/IndexedQueryManager";

const web3 = new Web3();

export async function verifyReferencedPaymentNonexistenceBTC(client: RPCInterface, bytes: string, indexer: IndexedQueryManager) {
   let request = parseRequestBytes(bytes, TDEF) as ARReferencedPaymentNonexistence;

   // Do the magic here and fill the response with the relevant data

   let response = {
         endTimestamp: randSol(request, "endTimestamp", "uint64") as BN,
         endBlock: randSol(request, "endBlock", "uint64") as BN,
         destinationAddress: randSol(request, "destinationAddress", "bytes32") as string,
         paymentReference: randSol(request, "paymentReference", "uint128") as BN,
         amount: randSol(request, "amount", "uint128") as BN,
         firstCheckedBlock: randSol(request, "firstCheckedBlock", "uint64") as BN,
         firstCheckedBlockTimestamp: randSol(request, "firstCheckedBlockTimestamp", "uint64") as BN,
         firstOverflowBlock: randSol(request, "firstOverflowBlock", "uint64") as BN,
         firstOverflowBlockTimestamp: randSol(request, "firstOverflowBlockTimestamp", "uint64") as BN      
   } as DHReferencedPaymentNonexistence;
   let encoded = web3.eth.abi.encodeParameters(
      [
           "uint64",		// endTimestamp
           "uint64",		// endBlock
           "bytes32",		// destinationAddress
           "uint128",		// paymentReference
           "uint128",		// amount
           "uint64",		// firstCheckedBlock
           "uint64",		// firstCheckedBlockTimestamp
           "uint64",		// firstOverflowBlock
           "uint64",		// firstOverflowBlockTimestamp
      ],
      [
          response.endTimestamp,
          response.endBlock,
          response.destinationAddress,
          response.paymentReference,
          response.amount,
          response.firstCheckedBlock,
          response.firstCheckedBlockTimestamp,
          response.firstOverflowBlock,
          response.firstOverflowBlockTimestamp
      ]
   );
   let hash = web3.utils.soliditySha3(encoded)!;
   return {
      hash,
      response,
      status: VerificationStatus.OK
   } as Verification<DHReferencedPaymentNonexistence>;
}   
