//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { 
   ARPayment,
   ARBalanceDecreasingTransaction,
   ARConfirmedBlockHeightExists,
   ARReferencedPaymentNonexistence 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { SourceId } from "../../lib/verification/sources/sources";
import { 
   getRandomRequestForAttestationTypeAndChainId
} from "../../lib/verification/generated/attestation-random-utils";
import { encodeRequest } from "../../lib/verification/generated/attestation-request-encode";
import { parseRequest } from "../../lib/verification/generated/attestation-request-parse";
import { equalsRequest } from "../../lib/verification/generated/attestation-request-equals";

describe("Attestestation Request Parser", function () {

   it("Should encode and decode for 'Payment'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(1 as AttestationType, chainId as SourceId) as ARPayment;
   
         let bytes = encodeRequest(randomRequest);
         let parsedRequest = parseRequest(bytes);
         assert(equalsRequest(randomRequest, parsedRequest));
      }
   });
   
   it("Should encode and decode for 'BalanceDecreasingTransaction'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(2 as AttestationType, chainId as SourceId) as ARBalanceDecreasingTransaction;
   
         let bytes = encodeRequest(randomRequest);
         let parsedRequest = parseRequest(bytes);
         assert(equalsRequest(randomRequest, parsedRequest));
      }
   });
   
   it("Should encode and decode for 'ConfirmedBlockHeightExists'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(3 as AttestationType, chainId as SourceId) as ARConfirmedBlockHeightExists;
   
         let bytes = encodeRequest(randomRequest);
         let parsedRequest = parseRequest(bytes);
         assert(equalsRequest(randomRequest, parsedRequest));
      }
   });
   
   it("Should encode and decode for 'ReferencedPaymentNonexistence'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(4 as AttestationType, chainId as SourceId) as ARReferencedPaymentNonexistence;
   
         let bytes = encodeRequest(randomRequest);
         let parsedRequest = parseRequest(bytes);
         assert(equalsRequest(randomRequest, parsedRequest));
      }
   });

});  
