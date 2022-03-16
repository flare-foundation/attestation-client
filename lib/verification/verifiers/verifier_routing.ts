//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { ChainType, MccClient, MCC } from "flare-mcc"
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
import {verifyConfirmedBlockHeightExistsXRP} from "./XRP/v-00003-confirmed-block-height-exists.xrp"
import {verifyConfirmedBlockHeightExistsBTC} from "./BTC/v-00003-confirmed-block-height-exists.btc"
import {verifyConfirmedBlockHeightExistsLTC} from "./LTC/v-00003-confirmed-block-height-exists.ltc"
import {verifyConfirmedBlockHeightExistsDOGE} from "./DOGE/v-00003-confirmed-block-height-exists.doge"
import {verifyConfirmedBlockHeightExistsALGO} from "./ALGO/v-00003-confirmed-block-height-exists.algo"
import {verifyReferencedPaymentNonexistenceXRP} from "./XRP/v-00004-referenced-payment-nonexistence.xrp"
import {verifyReferencedPaymentNonexistenceBTC} from "./BTC/v-00004-referenced-payment-nonexistence.btc"
import {verifyReferencedPaymentNonexistenceLTC} from "./LTC/v-00004-referenced-payment-nonexistence.ltc"
import {verifyReferencedPaymentNonexistenceDOGE} from "./DOGE/v-00004-referenced-payment-nonexistence.doge"
import {verifyReferencedPaymentNonexistenceALGO} from "./ALGO/v-00004-referenced-payment-nonexistence.algo"

import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager"
import { Attestation } from "../../attester/Attestation"

export class WrongAttestationTypeError extends Error {
   constructor(message) {
      super(message);
      this.name = 'WrongAttestationTypeError';
   }
}

export class WrongSourceIdError extends Error {
   constructor(message) {
      super(message);
      this.name = 'WrongAttestationTypeError';
   }
}

export async function verifyAttestation(client: MccClient, attestation: Attestation, indexer: IndexedQueryManager, recheck = false): Promise<Verification<any, any>>{
   let {attestationType, sourceId} = getAttestationTypeAndSource(attestation.data.request);
   switch(attestationType) {
      case AttestationType.Payment:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyPaymentXRP(client as MCC.XRP, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyPaymentBTC(client as MCC.BTC, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyPaymentLTC(client as MCC.LTC, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyPaymentDOGE(client as MCC.DOGE, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyPaymentALGO(client as MCC.ALGO, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      case AttestationType.BalanceDecreasingTransaction:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBalanceDecreasingTransactionXRP(client as MCC.XRP, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyBalanceDecreasingTransactionBTC(client as MCC.BTC, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyBalanceDecreasingTransactionLTC(client as MCC.LTC, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyBalanceDecreasingTransactionDOGE(client as MCC.DOGE, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyBalanceDecreasingTransactionALGO(client as MCC.ALGO, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      case AttestationType.ConfirmedBlockHeightExists:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyConfirmedBlockHeightExistsXRP(client as MCC.XRP, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyConfirmedBlockHeightExistsBTC(client as MCC.BTC, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyConfirmedBlockHeightExistsLTC(client as MCC.LTC, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyConfirmedBlockHeightExistsDOGE(client as MCC.DOGE, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyConfirmedBlockHeightExistsALGO(client as MCC.ALGO, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      case AttestationType.ReferencedPaymentNonexistence:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyReferencedPaymentNonexistenceXRP(client as MCC.XRP, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyReferencedPaymentNonexistenceBTC(client as MCC.BTC, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyReferencedPaymentNonexistenceLTC(client as MCC.LTC, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyReferencedPaymentNonexistenceDOGE(client as MCC.DOGE, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyReferencedPaymentNonexistenceALGO(client as MCC.ALGO, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      default:
         throw new WrongAttestationTypeError("Wrong attestation type.")
   }   
}