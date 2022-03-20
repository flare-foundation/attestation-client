//////////////////////////////////////////////////////////////
// This file is auto generated. You may edit it only in the 
// marked section between //-$$$<start> and //-$$$<end>.
// You may also import custom imports needed for the code
// in the custom section, which should be placed immediately 
// in the usual import section (below this comment)
//////////////////////////////////////////////////////////////

import { ARPayment, Attestation, BN, DHPayment, hashPayment, IndexedQueryManager, MCC, parseRequest, randSol, Verification, VerificationStatus, Web3 } from "./0imports";
import { BtcTransaction } from "flare-mcc";
import { utxoBasedPaymentVerification } from "../../verification-utils/utxo-based-verification-utils";

const web3 = new Web3();

export async function verifyPaymentBTC(
   client: MCC.BTC, 
   attestation: Attestation, 
   indexer: IndexedQueryManager, 
   recheck = false
): Promise<Verification<ARPayment, DHPayment>>
{
   let request = parseRequest(attestation.data.request) as ARPayment;
   let roundId = attestation.round.roundId;
   let numberOfConfirmations = attestation.sourceHandler.config.requiredBlocks;

   //-$$$<start> of the custom code section. Do not change this comment. XXX

   let result = await utxoBasedPaymentVerification(BtcTransaction, request, roundId, numberOfConfirmations, recheck, indexer, client);
   if (result.status != VerificationStatus.OK) {
      return { status: result.status }
   }

   let response = result.response;   

   //-$$$<end> of the custom section. Do not change this comment.



   let hash = hashPayment(request, response);

   return {
      hash,
      request,
      response,
      status: VerificationStatus.OK
   }
}   
