//////////////////////////////////////////////////////////////
// This file is auto generated. Do not edit.
//////////////////////////////////////////////////////////////

export enum AttestationType {
  Payment = 1,
  BalanceDecreasingTransaction = 2,
  ConfirmedBlockHeightExists = 3,
  ReferencedPaymentNonexistence = 4,
  TrustlineIssuance = 5,
}


export function getAttestationTypeName(attestationType: number) {
  if (attestationType == null || AttestationType[attestationType] === null) {
    return null;
  }
  return AttestationType[attestationType];
}