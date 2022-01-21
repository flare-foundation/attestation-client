import { AdditionalTransactionDetails, ChainType, IUtxoGetTransactionRes, RPCInterface } from "../../MCC/types";
import { toBN, toNumber, unPrefix0x } from "../../MCC/utils";
import { checkDataAvailability } from "../attestation-request-utils";
import { AttestationType, NormalizedTransactionData, TransactionAttestationRequest, VerificationStatus } from "../attestation-types";
import { numberOfConfirmations } from "../confirmations";


////////////////////////////////////////////////////////////////////////////////////////
// Verification
////////////////////////////////////////////////////////////////////////////////////////

export async function verififyAttestationUtxo(client: RPCInterface, attRequest: TransactionAttestationRequest, testFailProbability = 0) {
    try {
        let txResponse = (await client.getTransaction(unPrefix0x(attRequest.id), { verbose: true })) as IUtxoGetTransactionRes;
        let additionalData = await client.getAdditionalTransactionDetails({
            transaction: txResponse,
            confirmations: numberOfConfirmations(toNumber(attRequest.chainId) as ChainType),
            getDataAvailabilityProof: false  // obtained separeately
        });
        return checkAndAggregateUtxo(additionalData, attRequest, testFailProbability);
    } catch (error) {
        // TODO: handle error
        console.log(error);
        return {} as any;
    }
}

function checkAndAggregateToOnePaymentUtxo(
    additionalData: AdditionalTransactionDetails,
    attRequest: TransactionAttestationRequest,
    testFailProbability = 0
): NormalizedTransactionData {
    function genericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...additionalData,
            verificationStatus,
            utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // Test simulation of "too early check"
    if (testFailProbability > 0) {
        if (Math.random() < testFailProbability) {
            return genericReturnWithStatus(VerificationStatus.RECHECK_LATER);
        }
    }

    // check against instructions
    // if (!instructionsCheck(additionalData, attRequest)) {
    //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
    // }

    // Extract source address
    if (attRequest.utxo === undefined) {
        return genericReturnWithStatus(VerificationStatus.MISSING_IN_UTXO);
    }

    let inUtxo = toNumber(attRequest.utxo)!;
    if (inUtxo < 0 || inUtxo >= additionalData.sourceAddresses.length) {
        return genericReturnWithStatus(VerificationStatus.WRONG_IN_UTXO);
    }
    let sourceCandidates = additionalData.sourceAddresses[inUtxo!];
    // TODO: handle multisig
    if (sourceCandidates.length != 1) {
        return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
    }

    let theSource = sourceCandidates[0];
    if (theSource === "") {
        // console.log(additionalData.sourceAddresses[inUtxo])
        return genericReturnWithStatus(VerificationStatus.EMPTY_IN_ADDRESS);
    }
    let inFunds = toBN(0);
    // Calculate in funds
    for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
        let sources = additionalData.sourceAddresses[i];
        // TODO: Handle multisig addresses
        if (sources.length != 1) {
            continue;
        }
        let aSource = sources[0];
        if (aSource === theSource) {
            inFunds = inFunds.add((additionalData.spent as BN[])[i]);
        }
    }

    // Calculate total input funds
    let totalInFunds = toBN(0);
    (additionalData.spent as BN[]).forEach((value) => {
        totalInFunds = totalInFunds.add(value);
    });

    let destinations = new Set<string>();
    for (let destination of additionalData.destinationAddresses) {
        if (!destination || destination.length === 0) {
            // TODO: verify if no-address destinations (like type nulldata) can take funds.
            continue;
        }
        if (destination.length > 1) {
            return genericReturnWithStatus(VerificationStatus.FORBIDDEN_MULTISIG_DESTINATION);
        }
        let address = destination[0];
        if (address != theSource) {
            destinations.add(address);
        }
    }
    if (destinations.size === 0) {
        return genericReturnWithStatus(VerificationStatus.FORBIDDEN_SELF_SENDING);
    }
    if (destinations.size > 1) {
        return genericReturnWithStatus(VerificationStatus.NOT_SINGLE_DESTINATION_ADDRESS);
    }

    let theDestination = [...destinations][0];
    let totalOutFunds = toBN(0);
    let returnedFunds = toBN(0);

    for (let i = 0; i < (additionalData.delivered as BN[]).length; i++) {
        let destinations = (additionalData.destinationAddresses as string[][])[i];
        if (!destinations || destinations.length === 0) {
            // TODO: check if founds for empty transaction are 0
            continue;
        }
        let destAddress = destinations[0];
        let destDelivered = (additionalData.delivered as BN[])[i];
        if (destAddress === theSource) {
            returnedFunds = returnedFunds.add(destDelivered);
        }
        totalOutFunds = totalOutFunds.add(destDelivered);
    }

    let newAdditionalData = {
        ...additionalData,
        sourceAddresses: theSource,
        destinationAddresses: theDestination,
        spent: inFunds.sub(returnedFunds),
        delivered: totalOutFunds.sub(returnedFunds),
        fee: totalInFunds.sub(totalOutFunds),
    } as AdditionalTransactionDetails;

    function newGenericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...newAdditionalData,
            verificationStatus,
            utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // Check that net spent amount must be > 0
    if (returnedFunds.eq(inFunds)) {
        return genericReturnWithStatus(VerificationStatus.FUNDS_UNCHANGED);
    }
    if (returnedFunds.gt(inFunds)) {
        return genericReturnWithStatus(VerificationStatus.FUNDS_INCREASED);
    }

    // check confirmations
    let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
        return newGenericReturnWithStatus(dataAvailabilityVerification);
    }

    return newGenericReturnWithStatus(VerificationStatus.OK);
}

function checkAndAggregateDecreaseBalancePaymentUtxo(
    additionalData: AdditionalTransactionDetails,
    attRequest: TransactionAttestationRequest,
    testFailProbability = 0
) {
    function genericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...additionalData,
            verificationStatus,
            utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // Test simulation of "too early check"
    if (testFailProbability > 0) {
        if (Math.random() < testFailProbability) {
            return genericReturnWithStatus(VerificationStatus.RECHECK_LATER);
        }
    }

    // check against instructions
    // if (!instructionsCheck(additionalData, attRequest)) {
    //   return genericReturnWithStatus(VerificationStatus.INSTRUCTIONS_DO_NOT_MATCH);
    // }

    // find matching address and calculate funds taken from it
    let sourceIndices: number[] = [];
    let theSource: string | undefined;
    let inFunds = toBN(0);

    if (attRequest.utxo === undefined) {
        return genericReturnWithStatus(VerificationStatus.MISSING_IN_UTXO);
    }
    let inUtxo = toNumber(attRequest.utxo)!;
    if (inUtxo < 0 || inUtxo >= additionalData.sourceAddresses.length) {
        return genericReturnWithStatus(VerificationStatus.WRONG_IN_UTXO);
    }
    let sourceCandidates = additionalData.sourceAddresses[inUtxo!];
    // TODO: handle multisig
    if (sourceCandidates.length != 1) {
        return genericReturnWithStatus(VerificationStatus.UNSUPPORTED_SOURCE_ADDRESS);
    }

    theSource = sourceCandidates[0];

    // Calculate in funds
    for (let i = 0; i < additionalData.sourceAddresses.length; i++) {
        let sources = additionalData.sourceAddresses[i];
        // TODO: Handle multisig addresses
        if (sources.length != 1) {
            continue;
        }
        let aSource = sources[0];
        if (aSource === theSource) {
            sourceIndices.push(i);
            inFunds = inFunds.add((additionalData.spent as BN[])[i]);
        }
    }

    // calculate returned funds
    let returnedFunds = toBN(0);
    for (let i = 0; i < additionalData.destinationAddresses.length; i++) {
        let destination = additionalData.destinationAddresses[i];
        // TODO: handle multisig given source address?
        if (destination.length != 1) {
            continue;
        }
        if (destination[0] === theSource) {
            let destDelivered = (additionalData.delivered as BN[])[i];
            returnedFunds = returnedFunds.add(destDelivered);
        }
    }

    if (returnedFunds.eq(inFunds)) {
        return genericReturnWithStatus(VerificationStatus.FUNDS_UNCHANGED);
    }
    if (returnedFunds.gt(inFunds)) {
        return genericReturnWithStatus(VerificationStatus.FUNDS_INCREASED);
    }

    let newAdditionalData = {
        ...additionalData,
        sourceAddresses: theSource,
        spent: inFunds.sub(returnedFunds),
    } as AdditionalTransactionDetails;

    function newGenericReturnWithStatus(verificationStatus: VerificationStatus) {
        return {
            chainId: toBN(attRequest.chainId),
            attestationType: attRequest.attestationType!,
            ...newAdditionalData,
            verificationStatus,
            utxo: attRequest.utxo,
        } as NormalizedTransactionData;
    }

    // check confirmations
    let dataAvailabilityVerification = checkDataAvailability(newAdditionalData, attRequest);
    if (dataAvailabilityVerification != VerificationStatus.OK) {
        return newGenericReturnWithStatus(dataAvailabilityVerification);
    }

    return newGenericReturnWithStatus(VerificationStatus.OK);
}

function checkAndAggregateUtxo(
    additionalData: AdditionalTransactionDetails,
    attRequest: TransactionAttestationRequest,
    testFailProbability = 0
): NormalizedTransactionData {
    switch (attRequest.attestationType) {
        case AttestationType.FassetPaymentProof:
            return checkAndAggregateToOnePaymentUtxo(additionalData, attRequest, testFailProbability);
        case AttestationType.BalanceDecreasingProof:
            return checkAndAggregateDecreaseBalancePaymentUtxo(additionalData, attRequest, testFailProbability);
        default:
            throw new Error(`Invalid attestation type ${attRequest.attestationType}`);
    }
}


////////////////////////////////////////////////////////////////////////////////////////
// Support
////////////////////////////////////////////////////////////////////////////////////////

export function isSupportedTransactionUtxo(transaction: any, attType: AttestationType): boolean {
    return true;
}
