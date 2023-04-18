//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

import Web3 from "web3";
import { ARPayment, ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARReferencedPaymentNonexistence, ARBase } from "./attestation-request-types";
import { DHPayment, DHBalanceDecreasingTransaction, DHConfirmedBlockHeightExists, DHReferencedPaymentNonexistence, DHType } from "./attestation-hash-types";
import { AttestationType } from "./attestation-types-enum";

const web3 = new Web3();
//////////////////////////////////////////////////////////////
// Hash functions for requests and responses for particular
// Attestation types.
//////////////////////////////////////////////////////////////

/**
 * Calculates the hash of a @param response to the attestation @param request of type Payment with added @param salt
 * @param request
 * @param response
 * @param salt
 */
export function hashPayment(request: ARBase, response: DHPayment, salt?: string) {
  const types = [
    "uint16", // attestationType
    "uint32", // sourceId
    "uint64", // blockNumber
    "uint64", // blockTimestamp
    "bytes32", // transactionHash
    "uint8", // inUtxo
    "uint8", // utxo
    "bytes32", // sourceAddressHash
    "bytes32", // receivingAddressHash
    "int256", // spentAmount
    "int256", // receivedAmount
    "bytes32", // paymentReference
    "bool", // oneToOne
    "uint8", // status
  ];
  const values = [
    request.attestationType,
    request.sourceId,
    response.blockNumber,
    response.blockTimestamp,
    response.transactionHash,
    response.inUtxo,
    response.utxo,
    response.sourceAddressHash,
    response.receivingAddressHash,
    response.spentAmount,
    response.receivedAmount,
    response.paymentReference,
    response.oneToOne,
    response.status,
  ] as any[];
  if (salt) {
    types.push("string");
    values.push(salt);
  }
  const encoded = web3.eth.abi.encodeParameters(types, values);

  return web3.utils.soliditySha3(encoded)!;
}

/**
 * Calculates the hash of a @param response to the attestation @param request of type BalanceDecreasingTransaction with added @param salt
 * @param request
 * @param response
 * @param salt
 */
export function hashBalanceDecreasingTransaction(request: ARBase, response: DHBalanceDecreasingTransaction, salt?: string) {
  const types = [
    "uint16", // attestationType
    "uint32", // sourceId
    "uint64", // blockNumber
    "uint64", // blockTimestamp
    "bytes32", // transactionHash
    "bytes32", // inUtxo
    "bytes32", // sourceAddressHash
    "int256", // spentAmount
    "bytes32", // paymentReference
  ];
  const values = [
    request.attestationType,
    request.sourceId,
    response.blockNumber,
    response.blockTimestamp,
    response.transactionHash,
    response.inUtxo,
    response.sourceAddressHash,
    response.spentAmount,
    response.paymentReference,
  ] as any[];
  if (salt) {
    types.push("string");
    values.push(salt);
  }
  const encoded = web3.eth.abi.encodeParameters(types, values);

  return web3.utils.soliditySha3(encoded)!;
}

/**
 * Calculates the hash of a @param response to the attestation @param request of type ConfirmedBlockHeightExists with added @param salt
 * @param request
 * @param response
 * @param salt
 */
export function hashConfirmedBlockHeightExists(request: ARBase, response: DHConfirmedBlockHeightExists, salt?: string) {
  const types = [
    "uint16", // attestationType
    "uint32", // sourceId
    "uint64", // blockNumber
    "uint64", // blockTimestamp
    "uint8", // numberOfConfirmations
    "uint64", // lowestQueryWindowBlockNumber
    "uint64", // lowestQueryWindowBlockTimestamp
  ];
  const values = [
    request.attestationType,
    request.sourceId,
    response.blockNumber,
    response.blockTimestamp,
    response.numberOfConfirmations,
    response.lowestQueryWindowBlockNumber,
    response.lowestQueryWindowBlockTimestamp,
  ] as any[];
  if (salt) {
    types.push("string");
    values.push(salt);
  }
  const encoded = web3.eth.abi.encodeParameters(types, values);

  return web3.utils.soliditySha3(encoded)!;
}

/**
 * Calculates the hash of a @param response to the attestation @param request of type ReferencedPaymentNonexistence with added @param salt
 * @param request
 * @param response
 * @param salt
 */
export function hashReferencedPaymentNonexistence(request: ARBase, response: DHReferencedPaymentNonexistence, salt?: string) {
  const types = [
    "uint16", // attestationType
    "uint32", // sourceId
    "uint64", // deadlineBlockNumber
    "uint64", // deadlineTimestamp
    "bytes32", // destinationAddressHash
    "bytes32", // paymentReference
    "uint128", // amount
    "uint64", // lowerBoundaryBlockNumber
    "uint64", // lowerBoundaryBlockTimestamp
    "uint64", // firstOverflowBlockNumber
    "uint64", // firstOverflowBlockTimestamp
  ];
  const values = [
    request.attestationType,
    request.sourceId,
    response.deadlineBlockNumber,
    response.deadlineTimestamp,
    response.destinationAddressHash,
    response.paymentReference,
    response.amount,
    response.lowerBoundaryBlockNumber,
    response.lowerBoundaryBlockTimestamp,
    response.firstOverflowBlockNumber,
    response.firstOverflowBlockTimestamp,
  ] as any[];
  if (salt) {
    types.push("string");
    values.push(salt);
  }
  const encoded = web3.eth.abi.encodeParameters(types, values);

  return web3.utils.soliditySha3(encoded)!;
}

/**
 * Calculates the hash of a @param response to the attestation @param request with added @param salt
 * @param request
 * @param response
 * @param salt
 */
export function dataHash(request: ARBase, response: DHType, salt?: string) {
  switch (request.attestationType) {
    case AttestationType.Payment:
      return hashPayment(request as ARPayment, response as DHPayment, salt);
    case AttestationType.BalanceDecreasingTransaction:
      return hashBalanceDecreasingTransaction(request as ARBalanceDecreasingTransaction, response as DHBalanceDecreasingTransaction, salt);
    case AttestationType.ConfirmedBlockHeightExists:
      return hashConfirmedBlockHeightExists(request as ARConfirmedBlockHeightExists, response as DHConfirmedBlockHeightExists, salt);
    case AttestationType.ReferencedPaymentNonexistence:
      return hashReferencedPaymentNonexistence(request as ARReferencedPaymentNonexistence, response as DHReferencedPaymentNonexistence, salt);
    default:
      throw new Error("Invalid attestation type");
  }
}
