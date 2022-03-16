//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType } from "flare-mcc";
import { AttestationTypeScheme } from "../../lib/verification/attestation-types/attestation-types";
import { assertEqualsByScheme, encodeRequestBytes, parseRequestBytes } from "../../lib/verification/attestation-types/attestation-types-helpers";
import { readAttestationTypeSchemes } from "../../lib/verification/codegen/cg-utils";
import { 
   ARPayment,
   ARBalanceDecreasingTransaction,
   ARConfirmedBlockHeightExists,
   ARReferencedPaymentNonexistence 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { 
   getRandomRequestForAttestationTypeAndChainId
} from "../../lib/verification/generated/attestation-utils";

describe("Attestestation Request Parser", function () {
   let definitions: AttestationTypeScheme[];

   before(async () => {
      definitions = await readAttestationTypeSchemes();
   });

   it("Should encode and decode for 'Payment'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(1 as AttestationType, chainId as ChainType) as ARPayment;
         let scheme = definitions.find(item => item.id === 1);
         let bytes = encodeRequestBytes(randomRequest, scheme);
         let parsedRequest = parseRequestBytes(bytes, scheme);
         for(let item of scheme.request) {
            assertEqualsByScheme(randomRequest[item.key], parsedRequest[item.key], item);
         }
      }
   });
   
   it("Should encode and decode for 'BalanceDecreasingTransaction'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(2 as AttestationType, chainId as ChainType) as ARBalanceDecreasingTransaction;
         let scheme = definitions.find(item => item.id === 2);
         let bytes = encodeRequestBytes(randomRequest, scheme);
         let parsedRequest = parseRequestBytes(bytes, scheme);
         for(let item of scheme.request) {
            assertEqualsByScheme(randomRequest[item.key], parsedRequest[item.key], item);
         }
      }
   });
   
   it("Should encode and decode for 'ConfirmedBlockHeightExists'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(3 as AttestationType, chainId as ChainType) as ARConfirmedBlockHeightExists;
         let scheme = definitions.find(item => item.id === 3);
         let bytes = encodeRequestBytes(randomRequest, scheme);
         let parsedRequest = parseRequestBytes(bytes, scheme);
         for(let item of scheme.request) {
            assertEqualsByScheme(randomRequest[item.key], parsedRequest[item.key], item);
         }
      }
   });
   
   it("Should encode and decode for 'ReferencedPaymentNonexistence'", async function () { 
      for(let chainId of [3,0,1,2,4]) {
         let randomRequest = getRandomRequestForAttestationTypeAndChainId(4 as AttestationType, chainId as ChainType) as ARReferencedPaymentNonexistence;
         let scheme = definitions.find(item => item.id === 4);
         let bytes = encodeRequestBytes(randomRequest, scheme);
         let parsedRequest = parseRequestBytes(bytes, scheme);
         for(let item of scheme.request) {
            assertEqualsByScheme(randomRequest[item.key], parsedRequest[item.key], item);
         }
      }
   });

});  
