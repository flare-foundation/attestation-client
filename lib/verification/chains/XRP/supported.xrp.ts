import { TransactionMetadata } from "xrpl";
import { AttestationType } from "../../generated/attestation-types-enum";

////////////////////////////////////////////////////////////////////////////////////////
// Support
////////////////////////////////////////////////////////////////////////////////////////

export function isSupportedTransactionXRP(transaction: any, attType: AttestationType): boolean {
  if (!(transaction.metaData || transaction.meta)) {
    // console.log("E-1");
    return false;
  }
  if (transaction.TransactionType != "Payment") {
    // console.log("E-2");
    return false;
  }
  let meta = transaction.metaData || transaction.meta;
  if (typeof meta === "string") {
    // console.log("E-3");
    return false;
  }
  if (typeof (meta as TransactionMetadata).delivered_amount != "string") {
    // console.log("E-4");
    return false;
  }
  if (meta!.TransactionResult != "tesSUCCESS") {
    // console.log("E-5");
    return false;
  }
  return true;
}
