
//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType, RPCInterface } from "flare-mcc"
import { getAttestationTypeAndSource } from "../attestation-types/attestation-types-helpers"
import { AttestationType } from "../generated/attestation-types-enum"
import { SourceIndexer } from "../attestation-types/attestation-types"
      
import {verifyPaymentXRP} from "./XRP/v-00001-payment.xrp"
import {verifyPaymentBTC} from "./BTC/v-00001-payment.btc"
import {verifyPaymentLTC} from "./LTC/v-00001-payment.ltc"
import {verifyPaymentDOGE} from "./DOGE/v-00001-payment.doge"
import {verifyPaymentALGO} from "./ALGO/v-00001-payment.algo"
import {verifyBalanceDecreasingPaymentXRP} from "./XRP/v-00002-balance-decreasing-payment.xrp"
import {verifyBalanceDecreasingPaymentBTC} from "./BTC/v-00002-balance-decreasing-payment.btc"
import {verifyBalanceDecreasingPaymentLTC} from "./LTC/v-00002-balance-decreasing-payment.ltc"
import {verifyBalanceDecreasingPaymentDOGE} from "./DOGE/v-00002-balance-decreasing-payment.doge"
import {verifyBalanceDecreasingPaymentALGO} from "./ALGO/v-00002-balance-decreasing-payment.algo"
import {verifyBlockHeightExistenceXRP} from "./XRP/v-00003-block-height-existence.xrp"
import {verifyBlockHeightExistenceBTC} from "./BTC/v-00003-block-height-existence.btc"
import {verifyBlockHeightExistenceLTC} from "./LTC/v-00003-block-height-existence.ltc"
import {verifyBlockHeightExistenceDOGE} from "./DOGE/v-00003-block-height-existence.doge"
import {verifyBlockHeightExistenceALGO} from "./ALGO/v-00003-block-height-existence.algo"
import {verifyReferencedPaymentNonExistenceXRP} from "./XRP/v-00004-referenced-payment-non-existence.xrp"
import {verifyReferencedPaymentNonExistenceBTC} from "./BTC/v-00004-referenced-payment-non-existence.btc"
import {verifyReferencedPaymentNonExistenceLTC} from "./LTC/v-00004-referenced-payment-non-existence.ltc"
import {verifyReferencedPaymentNonExistenceDOGE} from "./DOGE/v-00004-referenced-payment-non-existence.doge"
import {verifyReferencedPaymentNonExistenceALGO} from "./ALGO/v-00004-referenced-payment-non-existence.algo"


export function verifyAttestation(client: RPCInterface, request: string, indexer: SourceIndexer) {
   let {attestationType, sourceId} = getAttestationTypeAndSource(request);
   switch(attestationType) {
      case AttestationType.Payment:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyPaymentXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyPaymentBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyPaymentLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyPaymentDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyPaymentALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      case AttestationType.BalanceDecreasingPayment:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBalanceDecreasingPaymentXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyBalanceDecreasingPaymentBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyBalanceDecreasingPaymentLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyBalanceDecreasingPaymentDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyBalanceDecreasingPaymentALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      case AttestationType.BlockHeightExistence:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBlockHeightExistenceXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyBlockHeightExistenceBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyBlockHeightExistenceLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyBlockHeightExistenceDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyBlockHeightExistenceALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      case AttestationType.ReferencedPaymentNonExistence:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyReferencedPaymentNonExistenceXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyReferencedPaymentNonExistenceBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyReferencedPaymentNonExistenceLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyReferencedPaymentNonExistenceDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyReferencedPaymentNonExistenceALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      default:
         throw new Error("Wrong attestation type.")
   }   
}