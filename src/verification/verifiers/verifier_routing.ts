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

import { IndexedQueryManager } from "../../indexed-query-manager/IndexedQueryManager";
import { Attestation } from "../../attester/Attestation";
import { DHType } from "../generated/attestation-hash-types";
import { ARType } from "../generated/attestation-request-types";

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

export async function verifyAttestation(client: MccClient, attestation: Attestation, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  return traceFunction(_verifyAttestation, client, attestation.data.request, indexer);
}

export async function _verifyAttestation(client: MccClient, attestationRequest: string, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest);
  switch (attestationType) {
    case AttestationType.Payment:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyPaymentXRP(client as MCC.XRP, attestationRequest, indexer);
        case SourceId.BTC:
          return verifyPaymentBTC(client as MCC.BTC, attestationRequest, indexer);
        case SourceId.LTC:
          return verifyPaymentLTC(client as MCC.LTC, attestationRequest, indexer);
        case SourceId.DOGE:
          return verifyPaymentDOGE(client as MCC.DOGE, attestationRequest, indexer);
        case SourceId.ALGO:
          return verifyPaymentALGO(client as MCC.ALGO, attestationRequest, indexer);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.BalanceDecreasingTransaction:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyBalanceDecreasingTransactionXRP(client as MCC.XRP, attestationRequest, indexer);
        case SourceId.BTC:
          return verifyBalanceDecreasingTransactionBTC(client as MCC.BTC, attestationRequest, indexer);
        case SourceId.LTC:
          return verifyBalanceDecreasingTransactionLTC(client as MCC.LTC, attestationRequest, indexer);
        case SourceId.DOGE:
          return verifyBalanceDecreasingTransactionDOGE(client as MCC.DOGE, attestationRequest, indexer);
        case SourceId.ALGO:
          return verifyBalanceDecreasingTransactionALGO(client as MCC.ALGO, attestationRequest, indexer);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.ConfirmedBlockHeightExists:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyConfirmedBlockHeightExistsXRP(client as MCC.XRP, attestationRequest, indexer);
        case SourceId.BTC:
          return verifyConfirmedBlockHeightExistsBTC(client as MCC.BTC, attestationRequest, indexer);
        case SourceId.LTC:
          return verifyConfirmedBlockHeightExistsLTC(client as MCC.LTC, attestationRequest, indexer);
        case SourceId.DOGE:
          return verifyConfirmedBlockHeightExistsDOGE(client as MCC.DOGE, attestationRequest, indexer);
        case SourceId.ALGO:
          return verifyConfirmedBlockHeightExistsALGO(client as MCC.ALGO, attestationRequest, indexer);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    case AttestationType.ReferencedPaymentNonexistence:
      switch (sourceId) {
        case SourceId.XRP:
          return verifyReferencedPaymentNonexistenceXRP(client as MCC.XRP, attestationRequest, indexer);
        case SourceId.BTC:
          return verifyReferencedPaymentNonexistenceBTC(client as MCC.BTC, attestationRequest, indexer);
        case SourceId.LTC:
          return verifyReferencedPaymentNonexistenceLTC(client as MCC.LTC, attestationRequest, indexer);
        case SourceId.DOGE:
          return verifyReferencedPaymentNonexistenceDOGE(client as MCC.DOGE, attestationRequest, indexer);
        case SourceId.ALGO:
          return verifyReferencedPaymentNonexistenceALGO(client as MCC.ALGO, attestationRequest, indexer);
        default:
          throw new WrongSourceIdError("Wrong source id");
      }
    default:
      throw new WrongAttestationTypeError("Wrong attestation type.");
  }
}

export async function verifyBTC(client: MCC.BTC, attestationRequest: string, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest);

  if (sourceId != SourceId.BTC) {
    throw new WrongSourceIdError("Wrong source while calling 'verifyBTC'(...)");
  }

  switch (attestationType) {
    case AttestationType.Payment:
      return verifyPaymentBTC(client, attestationRequest, indexer);
    case AttestationType.BalanceDecreasingTransaction:
      return verifyBalanceDecreasingTransactionBTC(client, attestationRequest, indexer);
    case AttestationType.ConfirmedBlockHeightExists:
      return verifyConfirmedBlockHeightExistsBTC(client, attestationRequest, indexer);
    case AttestationType.ReferencedPaymentNonexistence:
      return verifyReferencedPaymentNonexistenceBTC(client, attestationRequest, indexer);
    default:
      throw new WrongAttestationTypeError("Unknown attestation type");
  }
}

export async function verifyLTC(client: MCC.LTC, attestationRequest: string, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest);

  if (sourceId != SourceId.LTC) {
    throw new WrongSourceIdError("Wrong source while calling 'verifyLTC'(...)");
  }

  switch (attestationType) {
    case AttestationType.Payment:
      return verifyPaymentLTC(client, attestationRequest, indexer);
    case AttestationType.BalanceDecreasingTransaction:
      return verifyBalanceDecreasingTransactionLTC(client, attestationRequest, indexer);
    case AttestationType.ConfirmedBlockHeightExists:
      return verifyConfirmedBlockHeightExistsLTC(client, attestationRequest, indexer);
    case AttestationType.ReferencedPaymentNonexistence:
      return verifyReferencedPaymentNonexistenceLTC(client, attestationRequest, indexer);
    default:
      throw new WrongAttestationTypeError("Unknown attestation type");
  }
}

export async function verifyDOGE(client: MCC.DOGE, attestationRequest: string, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest);

  if (sourceId != SourceId.DOGE) {
    throw new WrongSourceIdError("Wrong source while calling 'verifyDOGE'(...)");
  }

  switch (attestationType) {
    case AttestationType.Payment:
      return verifyPaymentDOGE(client, attestationRequest, indexer);
    case AttestationType.BalanceDecreasingTransaction:
      return verifyBalanceDecreasingTransactionDOGE(client, attestationRequest, indexer);
    case AttestationType.ConfirmedBlockHeightExists:
      return verifyConfirmedBlockHeightExistsDOGE(client, attestationRequest, indexer);
    case AttestationType.ReferencedPaymentNonexistence:
      return verifyReferencedPaymentNonexistenceDOGE(client, attestationRequest, indexer);
    default:
      throw new WrongAttestationTypeError("Unknown attestation type");
  }
}

export async function verifyXRP(client: MCC.XRP, attestationRequest: string, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest);

  if (sourceId != SourceId.XRP) {
    throw new WrongSourceIdError("Wrong source while calling 'verifyXRP'(...)");
  }

  switch (attestationType) {
    case AttestationType.Payment:
      return verifyPaymentXRP(client, attestationRequest, indexer);
    case AttestationType.BalanceDecreasingTransaction:
      return verifyBalanceDecreasingTransactionXRP(client, attestationRequest, indexer);
    case AttestationType.ConfirmedBlockHeightExists:
      return verifyConfirmedBlockHeightExistsXRP(client, attestationRequest, indexer);
    case AttestationType.ReferencedPaymentNonexistence:
      return verifyReferencedPaymentNonexistenceXRP(client, attestationRequest, indexer);
    default:
      throw new WrongAttestationTypeError("Unknown attestation type");
  }
}

export async function verifyALGO(client: MCC.ALGO, attestationRequest: string, indexer: IndexedQueryManager): Promise<Verification<ARType, DHType>> {
  let { attestationType, sourceId } = getAttestationTypeAndSource(attestationRequest);

  if (sourceId != SourceId.ALGO) {
    throw new WrongSourceIdError("Wrong source while calling 'verifyALGO'(...)");
  }

  switch (attestationType) {
    case AttestationType.Payment:
      return verifyPaymentALGO(client, attestationRequest, indexer);
    case AttestationType.BalanceDecreasingTransaction:
      return verifyBalanceDecreasingTransactionALGO(client, attestationRequest, indexer);
    case AttestationType.ConfirmedBlockHeightExists:
      return verifyConfirmedBlockHeightExistsALGO(client, attestationRequest, indexer);
    case AttestationType.ReferencedPaymentNonexistence:
      return verifyReferencedPaymentNonexistenceALGO(client, attestationRequest, indexer);
    default:
      throw new WrongAttestationTypeError("Unknown attestation type");
  }
}
