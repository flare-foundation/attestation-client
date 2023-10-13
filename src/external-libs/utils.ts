import { ethers } from "ethers";
import { readFileSync, readdirSync } from "fs";
import * as path from "path";
import { TypeRecord } from "./config-types";

/**
 * ABIFragment is a subset of ethers ABIFragment. It is used to define the ABI fragments
 */
export interface ABIFragment {
    components?: ABIFragment[];
    internalType: string;
    name: string;
    type: string;
}

export const DEFAULT_ATTESTATION_TYPE_CONFIGS_PATH = "generated/configs/abi";
export const MIC_SALT = "Flare";
export const ZERO_BYTES_32 = ethers.zeroPadBytes("0x", 32);
export const ZERO_BYTES_20 = ethers.zeroPadBytes("0x", 20);

/**
 * Compares values of Solidity elementary types when represented in JSON.
 * Checks the consistency of the types and the values.
 * @param val1
 * @param val2
 * @param type
 * @returns
 */
function compareElementaryTypes(val1: any, val2: any, type: string): boolean {
    if (type.match(/^u?int\d+$/)) {
        // Input values could be number, BigInt or string representing decimal or hex (0x-prefixed).
        if (typeof val1 === "number" || typeof val1 === "bigint" || typeof val1 === "string") {
            // throws if the value is not parsable as a BigInt
            return BigInt(val1) === BigInt(val2);
        }
        throw new Error(`Invalid values for type '${type}': ${val1}, ${val2}`);
    }
    if (type.match(/^bool$/)) {
        // values must be true or false
        if ((val1 === true || val1 === false) && (val2 === true || val2 === false)) {
            return val1 === val2;
        }
        throw new Error(`Invalid values for type '${type}': ${val1}, ${val2}`);
    }
    if (type.match(/^bytes\d*$/) || type.match(/^byte$/) || type.match(/^address$/)) {
        // Input values must be be string or hex (0x-prefixed)
        if (typeof val1 === "string" && typeof val2 === "string") {
            const lower1 = val1.toLowerCase();
            const lower2 = val2.toLowerCase();
            if (/^0x[0-9a-f]+$/i.test(lower1) && /^0x[0-9a-f]+$/i.test(lower2)) {
                return lower1 === lower2;
            }
        }
        throw new Error(`Invalid values for type '${type}': '${val1}', '${val2}'`);
    }
    if (type.match(/^string$/)) {
        // Input values must be string
        if (typeof val1 === "string" && typeof val2 === "string") {
            return val1 === val2;
        }
        throw new Error(`Invalid values for type '${type}': '${val1}', '${val2}'`);
    }
    throw new Error(`Unknown or unsupported type '${type}'`);
}

/**
 * Checks if the type is one of the supported Solidity type names.
 * Note: the checks for supported numbers N in 'intN', 'uintN' and 'bytesN' is not implemented. The function is safe only under assumption
 * that the correct types supported by the Solidity compiler are used.
 * @param type
 * @returns
 */
export function isSupportedBasicSolidityType(type: string): boolean {
    //
    return (
        !!type.match(/^u?int\d+$/) ||
        !!type.match(/^bool$/) ||
        !!type.match(/^bytes\d*$/) ||
        !!type.match(/^byte$/) ||
        !!type.match(/^address$/) ||
        !!type.match(/^string$/)
    );
}

/**
 * Encodes attestation type name or source id as a 32-byte hex string.
 * It takes the UTF-8 bytes of the name and pads them with zeros to 32 bytes.
 * @param attestationTypeName
 * @returns '0x'-prefixed hex string representing 32-bytes
 */
export function encodeAttestationName(attestationTypeName: string) {
    if (typeof attestationTypeName !== "string") {
        throw new Error(`Attestation type name must be a string. Provided value ${attestationTypeName}`);
    }
    if (attestationTypeName.startsWith("0x") || attestationTypeName.startsWith("0X")) {
        throw new Error(`Attestation type name must not start with '0x'. Provided value '${attestationTypeName}'. Possible confusion with hex encoding.`);
    }
    const bytes = ethers.toUtf8Bytes(attestationTypeName);
    if (bytes.length > 32) {
        throw new Error(`Attestation type name ${attestationTypeName} is too long`);
    }
    return ethers.zeroPadBytes(bytes, 32);
}

/**
 * Decodes attestation type name or source id from a 32-byte hex string.
 * @param encoded Should be a '0x'-prefixed hex string representing exactly 32-bytes.
 * @returns
 */
export function decodeAttestationName(encoded: string) {
    if (!/^0x[0-9a-fA-F]{64}$/i.test(encoded)) {
        throw new Error("Not a 0x-prefixed 32-byte hex string");
    }
    // strip trailing zeros
    let stripped = encoded.replace(/0+$/, "");
    // if the string is odd-length, add a zero to the end for full bytes
    stripped = stripped.length % 2 == 0 ? stripped : stripped + "0";
    const bytes = ethers.toBeArray(stripped);
    return ethers.toUtf8String(bytes);
}

/**
 * Given a ABI decoded object (with tuples) based on the provided JSON ABI definition,
 * it creates a possibly nested Javascript object compatible with the ABI definitions.
 * The function assumes that the decoded objects matches the ABI. If this is not the case,
 * function may behave in strange ways.
 * This is auxiliary function not intended to be used directly.
 * @param decoded
 * @param abi
 * @param ignoreArray parameter for recursion call when handling of arrays are needed.
 * @returns
 */
export function remapABIParsedToObjects(decoded: any, abi: ABIFragment, ignoreArray = false): any {
    if (abi.type == "tuple" || (abi.type == "tuple[]" && ignoreArray)) {
        const result: any = {};
        for (const [index, item] of abi.components!.entries()) {
            const key = item.name;
            result[key] = remapABIParsedToObjects(decoded[index], item);
        }
        return result;
    }
    if (abi.type == "tuple[]") {
        const result: any = [];
        for (const item of decoded) {
            result.push(remapABIParsedToObjects(item, abi, true));
        }
        return result;
    }

    if (abi.type.match(/^.+(\[(\d*)\])(\[(\d*)\])$/) || abi.type.match(/^.+(\[(\d+)\])$/)) {
        throw new Error(`Nested arrays or fixed length arrays not supported. Type: ${abi.type}`);
    }
    // we assume here we have `type[]` where `type` is one of simple types.
    const match = abi.type.match(/^(.+)\[\]$/);
    if (match && isSupportedBasicSolidityType(match[1])) {
        const result: any = [];
        for (const item of decoded) {
            result.push(item);
        }
        return result;
    }
    return decoded;
}

/**
 * Checks whether the struct objects are deep equal. Objects should match the ABI definition.
 * @param struct1
 * @param struct2
 * @param abi
 * @returns
 */
export function structsDeepEqual(struct1: any, struct2: any, abi: ABIFragment): boolean {
    if (Object.keys(struct1).length !== Object.keys(struct2).length) {
        return false;
    }
    for (const item of abi.components || []) {
        const key = item.name;
        const val1 = struct1[key];
        const val2 = struct2[key];

        if (val1 === undefined || val2 === undefined) {
            throw new Error(`Structs must not have undefined values for ${key}`);
        }

        if (item.type == "tuple") {
            if (!structsDeepEqual(struct1[key], struct2[key], item)) {
                return false;
            }
            continue;
        }

        if (item.type == "tuple[]") {
            if (val1.length != val2.length) {
                return false;
            }
            for (let i = 0; i < val1.length; i++) {
                if (!structsDeepEqual(val1[i], val2[i], item)) {
                    return false;
                }
            }
            continue;
        }

        if (item.components) {
            throw new Error("Components should not appear in non tuple ABI fragments");
        }

        if (item.type.match(/^.+(\[(\d*)\])(\[(\d*)\])$/) || item.type.match(/^.+(\[(\d+)\])$/)) {
            throw new Error(`Nested arrays or fixed length arrays not supported. Type: ${item.type}`);
        }
        // we assume here we have `type[]` where `type` is one of simple types.
        const match = item.type.match(/^(.+)\[\]$/);

        if (match && isSupportedBasicSolidityType(match[1])) {
            if (val1.length !== val2.length) {
                return false;
            }
            for (let i = 0; i < val1.length; i++) {
                if (!compareElementaryTypes(val1[i], val2[i], item.type.slice(0, -2))) {
                    return false;
                }
            }
            continue;
        }

        if (!compareElementaryTypes(val1, val2, item.type)) {
            return false;
        }
    }
    return true;
}
/**
 * Loader of the attestation type definition configs
 * @returns a map from attestation types to definition configs
 */
export function readAttestationTypeConfigs(configsPath = DEFAULT_ATTESTATION_TYPE_CONFIGS_PATH): Map<string, TypeRecord> {
    const typeRecMap = new Map<string, TypeRecord>();
    const files = readdirSync(configsPath);
    files.forEach((fileName) => {
        const name = path.basename(fileName, ".json");
        typeRecMap.set(name, JSON.parse(readFileSync(`${configsPath}/${fileName}`, "utf8")) as TypeRecord);
    });
    return typeRecMap;
}

/**
 * Helper function serializing bigints to strings recursively.
 * @param obj
 * @returns
 */
export function serializeBigInts(obj: any) {
    return JSON.parse(
        JSON.stringify(
            obj,
            (key, value) => (typeof value === "bigint" ? value.toString() : value), // return everything else unchanged
        ),
    );
}
