import { ethers } from "ethers";

export function seededRandHex(n: number, seed = "0") {
    return ethers.keccak256(ethers.toUtf8Bytes(seed)).slice(0, 2 + 2 * n);
}

/**
 * Helper random value generator for Solidity type values used in in randomized attestation requests or responses.
 * Primarily used for testing
 * @param typeName solidity type (e.g. uint256)
 * @returns
 */
export function randSol(typeName: string, seed = "0"): string | boolean {
    let match = typeName.match(/^.+(\[(\d*)\])$/);
    if (match) {
        const brackets = match[1];
        const value = parseInt(match[2]);
        const typeOfArray = typeName.slice(0, -brackets.length);
        if (!isNaN(value) || value === 0) {
            return (
                "[" +
                Array(value)
                    .fill(0)
                    .map(() => randSol(typeOfArray, seed))
                    .join(", ") +
                "]"
            );
        } else {
            const length = 3; // fixed length
            return (
                "[" +
                Array(length)
                    .fill(0)
                    .map(() => randSol(typeOfArray, seed))
                    .join(", ") +
                "]"
            );
        }
    }

    match = typeName.match(/^uint(\d+)$/);
    if (match) {
        return seededRandHex(parseInt(match[1]) / 8, seed);
    }
    match = typeName.match(/^int(\d+)$/);
    if (match) {
        const val = seededRandHex(parseInt(match[1]) / 8, seed);
        return "0x0" + val.slice(3);
    }
    if (typeName.match(/^bool$/)) {
        return true;
    }
    match = typeName.match(/^bytes(\d+)$/);
    if (match) {
        return seededRandHex(parseInt(match[1]), seed);
    }
    if (typeName.match(/^address$/)) {
        return seededRandHex(20, seed);
    }
    if (typeName.match(/^string$/)) {
        return "Random string";
    }
    if (typeName.match(/^byte$/)) {
        return seededRandHex(1, seed);
    }
    if (typeName.match(/^bytes$/)) {
        return seededRandHex(30, seed);
    }
    throw new Error(`Unsupported type ${typeName}`);
}
