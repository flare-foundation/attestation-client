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

export async function verifyAttestation(client: RPCInterface, attestation: Attestation, indexer: IndexedQueryManager, recheck = false): Promise<Verification<any>>{
   let {attestationType, sourceId} = getAttestationTypeAndSource(attestation.data.request);
   switch(attestationType) {
      case AttestationType.Payment:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyPaymentXRP(client, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyPaymentBTC(client, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyPaymentLTC(client, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyPaymentDOGE(client, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyPaymentALGO(client, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      case AttestationType.BalanceDecreasingTransaction:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBalanceDecreasingTransactionXRP(client, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyBalanceDecreasingTransactionBTC(client, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyBalanceDecreasingTransactionLTC(client, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyBalanceDecreasingTransactionDOGE(client, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyBalanceDecreasingTransactionALGO(client, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      case AttestationType.BlockHeightExists:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyBlockHeightExistsXRP(client, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyBlockHeightExistsBTC(client, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyBlockHeightExistsLTC(client, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyBlockHeightExistsDOGE(client, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyBlockHeightExistsALGO(client, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      case AttestationType.ReferencedPaymentNonexistence:
         switch(sourceId) {
            case ChainType.XRP:
               return verifyReferencedPaymentNonexistenceXRP(client, attestation, indexer, recheck);
            case ChainType.BTC:
               return verifyReferencedPaymentNonexistenceBTC(client, attestation, indexer, recheck);
            case ChainType.LTC:
               return verifyReferencedPaymentNonexistenceLTC(client, attestation, indexer, recheck);
            case ChainType.DOGE:
               return verifyReferencedPaymentNonexistenceDOGE(client, attestation, indexer, recheck);
            case ChainType.ALGO:
               return verifyReferencedPaymentNonexistenceALGO(client, attestation, indexer, recheck);
            default:
               throw new WrongSourceIdError("Wrong source id");
      }
      default:
         throw new WrongAttestationTypeError("Wrong attestation type.")
   }   
}