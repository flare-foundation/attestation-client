import { Payment } from "xrpl";
import { IssuedCurrencyAmount } from "xrpl/dist/npm/models/common";

export enum ChainTransactionType {
    FULL = 0,
    PARTIAL = 1
}

type TransactionData = {
    type: ChainTransactionType,
    chainId: BN,
    blockNumber: BN,
    txId: string,
    utxo: number,
    sourceAddress: string,
    destinationAddress: string,
    destinationTag: BN,
    amount: BN,
    gas: number
}

const toBN = web3.utils.toBN

export function fullTransactionHash(
    txData: TransactionData
) {
    if (txData.type != ChainTransactionType.FULL) throw Error("Not full transaction hash")
    const encoded = web3.eth.abi.encodeParameters(
        [
            'uint32', // type
            'uint64', // chainId
            'uint64', // blockNumber
            'bytes32',  // txId
            'uint16', // utxo
            'string',  // sourceAddress
            'string',  // destinationAddress
            'uint256', // destinationTag
            'uint256', // amount
            'uint32'  // gas
        ],
        [
            txData.type,
            txData.chainId,
            txData.blockNumber,
            txData.txId,
            txData.utxo,
            txData.sourceAddress,
            txData.destinationAddress,
            txData.destinationTag,
            txData.amount,
            txData.gas
        ]
    );
    return web3.utils.soliditySha3(encoded);
}

export async function xrpTransactionData(tx: any, silent: boolean = true) {
    if (tx.result.TransactionType != "Payment") {
        if (!silent) console.log("invalid transaction type (Payment expected) " + tx.result.TransactionType);
        return null;
    }
    let transaction = tx.result as Payment;
    if (!silent) console.log(tx);
    // console.log(transaction)
    //let sourceAddress = transaction.Account;

    let destinationAddress = transaction.Destination;
    let destinationTag = toBN(transaction.DestinationTag || 0)

    let amount: BN = toBN(0);
    let currency = "";
    if (!(transaction.Amount as any).value) {
        amount = toBN(transaction.Amount as string)
        currency = "xrp";
    }
    else {
        let issued = transaction.Amount as IssuedCurrencyAmount;
        if (!silent) console.log("ISSUED:", issued)

        if (typeof issued == "string") {
            currency = "xrp";
            amount = toBN(issued);
        } else {
            currency = issued.currency + issued.issuer;
            console.log("PROBLEM")
        }
    }
    if (!silent) console.log("AMM:", transaction.Amount, amount.toString(), currency, web3.utils.soliditySha3(amount.toNumber()), web3.utils.soliditySha3(amount.toString()))
    if (!silent) console.log("DD", destinationAddress, destinationTag, currency, amount)
    const salt = web3.utils.soliditySha3("FlareStateConnector_PAYMENTHASH");
    const destinationHash = web3.utils.soliditySha3(web3.utils.soliditySha3(destinationAddress!)!, web3.utils.soliditySha3(destinationTag!)!);
    const currencyHash = web3.utils.soliditySha3(currency || "");
    const amountHash = web3.utils.soliditySha3(amount.toNumber());
    const paymentHash = web3.utils.soliditySha3(salt!, destinationHash!, currencyHash!, amountHash!);

    return {
        type: ChainTransactionType.FULL,
        chainId: toBN(3),
        blockNumber: tx.result.ledger_index,
        txId: "0x" + tx.result.hash,
        utxo: 0,
        sourceAddress: tx.result.Account,
        destinationAddress,
        destinationTag,
        amount,
        gas: 0
    } as TransactionData
}



// Data we need for transaction proofs:
// Full:
// - transaction hash
// - block number
// - source address
// - target address
// - utxo
// - amount
// - gas
// Partial:
// - transaction hash
// - block number
// - source address