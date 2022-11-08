//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import { MccClient, MCC, traceFunction } from "@flarenetwork/mcc";
import { getAttestationTypeAndSource } from "../generated/attestation-request-parse";
import { AttestationType } from "../generated/attestation-types-enum";
import { SourceId } from "../sources/sources";
import { Verification } from "../attestation-types/attestation-types";

import { verifyPaymentXRP } from "./XRP/v-00001-payment.xrp";
import { verifyPaymentBTC } from "./BTC/v-00001-payment.btc";
import { verifyPaymentLTC } from "./LTC/v-00001-payment.ltc";
import { verifyPaymentDOGE } from "./DOGE/v-00001-payment.doge";
import { verifyPaymentALGO } from "./ALGO/v-00001-payment.algo";
import { verifyBalanceDecreasingTransactionXRP } from "./XRP/v-00002-balance-decreasing-transaction.xrp";
import { verifyBalanceDecreasingTransactionBTC } from "./BTC/v-00002-balance-decreasing-transaction.btc";
import { verifyBalanceDecreasingTransactionLTC } from "./LTC/v-00002-balance-decreasing-transaction.ltc";
import { verifyBalanceDecreasingTransactionDOGE } from "./DOGE/v-00002-balance-decreasing-transaction.doge";
import { verifyBalanceDecreasingTransactionALGO } from "./ALGO/v-00002-balance-decreasing-transaction.algo";
import { verifyConfirmedBlockHeightExistsXRP } from "./XRP/v-00003-confirmed-block-height-exists.xrp";
import { verifyConfirmedBlockHeightExistsBTC } from "./BTC/v-00003-confirmed-block-height-exists.btc";
import { verifyConfirmedBlockHeightExistsLTC } from "./LTC/v-00003-confirmed-block-height-exists.ltc";
import { verifyConfirmedBlockHeightExistsDOGE } from "./DOGE/v-00003-confirmed-block-height-exists.doge";
import { verifyConfirmedBlockHeightExistsALGO } from "./ALGO/v-00003-confirmed-block-height-exists.algo";
import { verifyReferencedPaymentNonexistenceXRP } from "./XRP/v-00004-referenced-payment-nonexistence.xrp";
import { verifyReferencedPaymentNonexistenceBTC } from "./BTC/v-00004-referenced-payment-nonexistence.btc";
import { verifyReferencedPaymentNonexistenceLTC } from "./LTC/v-00004-referenced-payment-nonexistence.ltc";
import { verifyReferencedPaymentNonexistenceDOGE } from "./DOGE/v-00004-referenced-payment-nonexistence.doge";
import { verifyReferencedPaymentNonexistenceALGO } from "./ALGO/v-00004-referenced-payment-nonexistence.algo";
import { verifyTrustlineIssuanceXRP } from "./XRP/v-00005-trustline-issuance.xrp";

import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { Attestation } from "../../attester/Attestation";

export class WrongAttestationTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = "WrongAttestationTypeError";
  }
}

export class WrongSourceIdError extends Error {
  constructor(message) {
    super(message);
    this.name = "WrongAttestationTypeError";
  }
}

export async function verifyAttestation(
  client: MccClient,
  attestation: Attestation,
  indexer: IndexedQueryManager,
  recheck = false
): Promise<Verification<any, any>> {
  return traceFunction(_verifyAttestation, client, attestation, indexer, recheck);
}

export async function _verifyAttestation(
  client: MccClient,
  attestation: Attestation,
  indexer: IndexedQueryManager,
  recheck = false
): Promise<Verification<any, any>> {
  const { attestationType, sourceId } = getAttestationTypeAndSource(attestation.data.request);
  switch (attestationType) {
    case AttestationType.Payment:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyPaymentXRP(client as MCC.XRP, attestation, indexer, recheck);
        case SourceId.BTC:
          return verifyPaymentBTC(client as MCC.BTC, attestation, indexer, recheck);
        case SourceId.LTC:
          return verifyPaymentLTC(client as MCC.LTC, attestation, indexer, recheck);
        case SourceId.DOGE:
          return verifyPaymentDOGE(client as MCC.DOGE, attestation, indexer, recheck);
        case SourceId.ALGO:
          return verifyPaymentALGO(client as MCC.ALGO, attestation, indexer, recheck);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.BalanceDecreasingTransaction:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyBalanceDecreasingTransactionXRP(client as MCC.XRP, attestation, indexer, recheck);
        case SourceId.BTC:
          return verifyBalanceDecreasingTransactionBTC(client as MCC.BTC, attestation, indexer, recheck);
        case SourceId.LTC:
          return verifyBalanceDecreasingTransactionLTC(client as MCC.LTC, attestation, indexer, recheck);
        case SourceId.DOGE:
          return verifyBalanceDecreasingTransactionDOGE(client as MCC.DOGE, attestation, indexer, recheck);
        case SourceId.ALGO:
          return verifyBalanceDecreasingTransactionALGO(client as MCC.ALGO, attestation, indexer, recheck);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.ConfirmedBlockHeightExists:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyConfirmedBlockHeightExistsXRP(client as MCC.XRP, attestation, indexer, recheck);
        case SourceId.BTC:
          return verifyConfirmedBlockHeightExistsBTC(client as MCC.BTC, attestation, indexer, recheck);
        case SourceId.LTC:
          return verifyConfirmedBlockHeightExistsLTC(client as MCC.LTC, attestation, indexer, recheck);
        case SourceId.DOGE:
          return verifyConfirmedBlockHeightExistsDOGE(client as MCC.DOGE, attestation, indexer, recheck);
        case SourceId.ALGO:
          return verifyConfirmedBlockHeightExistsALGO(client as MCC.ALGO, attestation, indexer, recheck);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.ReferencedPaymentNonexistence:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyReferencedPaymentNonexistenceXRP(client as MCC.XRP, attestation, indexer, recheck);
        case SourceId.BTC:
          return verifyReferencedPaymentNonexistenceBTC(client as MCC.BTC, attestation, indexer, recheck);
        case SourceId.LTC:
          return verifyReferencedPaymentNonexistenceLTC(client as MCC.LTC, attestation, indexer, recheck);
        case SourceId.DOGE:
          return verifyReferencedPaymentNonexistenceDOGE(client as MCC.DOGE, attestation, indexer, recheck);
        case SourceId.ALGO:
          return verifyReferencedPaymentNonexistenceALGO(client as MCC.ALGO, attestation, indexer, recheck);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.TrustlineIssuance:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyTrustlineIssuanceXRP(client as MCC.XRP, attestation, indexer, recheck);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    default:
      throw new WrongAttestationTypeError("Wrong attestation type.");
  }
}
