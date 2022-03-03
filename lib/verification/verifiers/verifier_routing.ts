//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType, RPCInterface } from "flare-mcc"
import { getAttestationTypeAndSource } from "../attestation-types/attestation-types-helpers"
import { AttestationType } from "../generated/attestation-types-enum"
import { Verification } from "../attestation-types/attestation-types"
      
import {verifyPaymentXRP} from "./XRP/v-00001-payment.xrp"
import {verifyPaymentBTC} from "./BTC/v-00001-payment.btc"
import {verifyPaymentLTC} from "./LTC/v-00001-payment.ltc"
import {verifyPaymentDOGE} from "./DOGE/v-00001-payment.doge"
import {verifyPaymentALGO} from "./ALGO/v-00001-payment.algo"
import {verifyBalanceDecreasingTransactionXRP} from "./XRP/v-00002-balance-decreasing-transaction.xrp"
import {verifyBalanceDecreasingTransactionBTC} from "./BTC/v-00002-balance-decreasing-transaction.btc"
import {verifyBalanceDecreasingTransactionLTC} from "./LTC/v-00002-balance-decreasing-transaction.ltc"
import {verifyBalanceDecreasingTransactionDOGE} from "./DOGE/v-00002-balance-decreasing-transaction.doge"
import {verifyBalanceDecreasingTransactionALGO} from "./ALGO/v-00002-balance-decreasing-transaction.algo"
import {verifyBlockHeightExistsXRP} from "./XRP/v-00003-block-height-exists.xrp"
import {verifyBlockHeightExistsBTC} from "./BTC/v-00003-block-height-exists.btc"
import {verifyBlockHeightExistsLTC} from "./LTC/v-00003-block-height-exists.ltc"
import {verifyBlockHeightExistsDOGE} from "./DOGE/v-00003-block-height-exists.doge"
import {verifyBlockHeightExistsALGO} from "./ALGO/v-00003-block-height-exists.algo"
import {verifyReferencedPaymentNonexistenceXRP} from "./XRP/v-00004-referenced-payment-nonexistence.xrp"
import {verifyReferencedPaymentNonexistenceBTC} from "./BTC/v-00004-referenced-payment-nonexistence.btc"
import {verifyReferencedPaymentNonexistenceLTC} from "./LTC/v-00004-referenced-payment-nonexistence.ltc"
import {verifyReferencedPaymentNonexistenceDOGE} from "./DOGE/v-00004-referenced-payment-nonexistence.doge"
import {verifyReferencedPaymentNonexistenceALGO} from "./ALGO/v-00004-referenced-payment-nonexistence.algo"

import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager"

export async function verifyAttestation(client: RPCInterface, request: string, indexer: IndexedQueryManager): Promise<Verification<any>>{
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
      case AttestationType.BalanceDecreasingTransaction:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBalanceDecreasingTransactionXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyBalanceDecreasingTransactionBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyBalanceDecreasingTransactionLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyBalanceDecreasingTransactionDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyBalanceDecreasingTransactionALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      case AttestationType.BlockHeightExists:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBlockHeightExistsXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyBlockHeightExistsBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyBlockHeightExistsLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyBlockHeightExistsDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyBlockHeightExistsALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      case AttestationType.ReferencedPaymentNonexistence:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyReferencedPaymentNonexistenceXRP(client, request, indexer);
            case ChainType.BTC:
               return verifyReferencedPaymentNonexistenceBTC(client, request, indexer);
            case ChainType.LTC:
               return verifyReferencedPaymentNonexistenceLTC(client, request, indexer);
            case ChainType.DOGE:
               return verifyReferencedPaymentNonexistenceDOGE(client, request, indexer);
            case ChainType.ALGO:
               return verifyReferencedPaymentNonexistenceALGO(client, request, indexer);
            default:
               throw new Error("Wrong source id");
         }
      default:
         throw new Error("Wrong attestation type.")
   }   
}