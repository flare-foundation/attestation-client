import base from "base-x";
import { VerificationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { AddressValidity_ResponseBody } from "../../dtos/attestation-types/AddressValidity.dto";
import { VerificationResponse } from "../verification-utils";
import { INVALID_ADDRESS_RESPONSE, base58Checksum, validAddressToResponse } from "./utils";

enum BTCAddressTypes {
  P2PKH = "P2PKH",
  P2SH = "P2SH",
  SEGWIT = "SEGWIT",
  INVALID = "INVALID",
}

enum BTCTestAddressTypes {
  TEST_P2PKH = "TEST_P2PKH",
  TEST_P2SH = "TEST_P2SH",
  TEST_SEGWIT = "TEST_SEGWIT",
  INVALID = "INVALID",
}

const BTC_BASE_58_DICT = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BTC_BASE_58_DICT_regex = /[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/;

const btcBase58 = base(BTC_BASE_58_DICT);

/**
 * Computes address type of a mainnet @param address inferred from the first few characters
 * @returns
 */
function typeBTC(address: string) {
  const prefix = address[0].toLowerCase();
  switch (prefix) {
    case "1":
      return BTCAddressTypes.P2PKH;
    case "3":
      return BTCAddressTypes.P2SH;
    case "b":
      if (address.slice(0, 3).toLowerCase() == "bc1") {
        return BTCAddressTypes.SEGWIT;
      }
      return BTCAddressTypes.INVALID;
    default:
      return BTCAddressTypes.INVALID;
  }
}

/**
 * Computes address type of a testnet @param address inferred from the first few characters
 * @returns
 */
function typeBTCtestnet(address: string) {
  const prefix = address[0].toLowerCase();
  switch (prefix) {
    case "n":
    case "m":
      return BTCTestAddressTypes.TEST_P2PKH;
    case "2":
      return BTCTestAddressTypes.TEST_P2SH;
    case "t":
      if (address.slice(0, 3).toLowerCase() == "tb1") {
        return BTCTestAddressTypes.TEST_SEGWIT;
      }
      return BTCAddressTypes.INVALID;
    default:
      return BTCAddressTypes.INVALID;
  }
}

////// bech32

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
type encoding = "bech32" | "bech32m";

type hrp = "bc" | "tb";

function isHrp(str: string): str is hrp {
  return str == "bc" || str == "tb";
}

// According to bip 173 (bech32) https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
// and bip 350 (bech32m) https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki

function getEncodingConst(enc: encoding) {
  if (enc == "bech32") {
    return 1;
  } else if (enc == "bech32m") {
    return 0x2bc830a3;
  }
}

function polyMod(values: string | any[]) {
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

export function hrpExpand(hrp: hrp) {
  const ret = [];
  let p;
  for (p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

function verifyChecksum(hrp: hrp, data: number[], enc: encoding) {
  return polyMod(hrpExpand(hrp).concat(data)) === getEncodingConst(enc);
}

export function bech32_decode(bechString: string, enc: encoding) {
  let p;
  let has_lower = false;
  let has_upper = false;
  for (p = 0; p < bechString.length; ++p) {
    if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
      return null;
    }
    if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
      has_lower = true;
    }
    if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
      has_upper = true;
    }
  }
  if (has_lower && has_upper) {
    return null;
  }
  bechString = bechString.toLowerCase();
  const pos = bechString.lastIndexOf("1");
  if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
    return null;
  }
  const hrp = bechString.substring(0, pos);
  if (!isHrp(hrp)) return null;
  const data = [];
  for (p = pos + 1; p < bechString.length; ++p) {
    const d = CHARSET.indexOf(bechString.charAt(p));
    if (d === -1) {
      return null;
    }
    data.push(d);
  }
  if (!verifyChecksum(hrp, data, enc)) {
    return null;
  }
  return { hrp: hrp, data: data.slice(0, data.length - 6) };
}

export function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    if (value < 0 || value >> fromBits !== 0) {
      return null;
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
    return null;
  }
  return ret;
}

export function bech32Decode(addr: string) {
  let bech32m = false;
  let dec = bech32_decode(addr, "bech32");
  if (dec === null) {
    dec = bech32_decode(addr, "bech32m");
    bech32m = true;
  }

  if (dec === null || dec.data.length < 1 || dec.data[0] > 16) {
    return null;
  }
  const res = convertBits(dec.data.slice(1), 5, 8, false);
  if (res === null || res.length < 2 || res.length > 40) {
    return null;
  }
  if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
    return null;
  }

  if (dec.data[0] === 0 && bech32m) {
    return null;
  }
  if (dec.data[0] !== 0 && !bech32m) {
    return null;
  }

  return { version: dec.data[0], program: res };
}

/**
 * Verifies that @param address given as a string represents a valid address on Bitcoin.
 * If @param testnet is truthy, checks whether address is valid on testnet.
 * @returns
 */
export function verifyAddressBTC(address: string, testnet = process.env.TESTNET): VerificationResponse<AddressValidity_ResponseBody> {
  if (testnet) {
    const type = typeBTCtestnet(address);

    switch (type) {
      case BTCTestAddressTypes.TEST_P2PKH:
      case BTCTestAddressTypes.TEST_P2SH: {
        //invalid length
        if (25 > address.length || address.length > 34) {
          return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        }
        // contains invalid characters
        else if (BTC_BASE_58_DICT_regex.test(address)) {
          return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        }

        // Regex ensures that address can be decoded
        const decodedAddress = btcBase58.decode(address);

        // invalid length
        if (decodedAddress.length != 25) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        // checksum fails
        else if (!base58Checksum(decodedAddress)) {
          return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
          // wrong prefix
        } else if (!(decodedAddress[0] == 111 || decodedAddress[0] == 196)) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        else {
          const response = validAddressToResponse(address, false);
          return { status: VerificationStatus.OK, response };
        }
      }
      case BTCTestAddressTypes.TEST_SEGWIT: {
        const version = bech32Decode(address)?.version;
        if (version == 0) {
          // P2WPKH or P2WSH
          if (address.length == 42 || address.length == 62) {
            const response = validAddressToResponse(address, true);
            return { status: VerificationStatus.OK, response };
          } else return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };

          //P2TR
        } else if (version == 1) {
          const response = validAddressToResponse(address, true);
          return { status: VerificationStatus.OK, response };
        }
        // invalid address / unsupported version
        else return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
      }
      case BTCAddressTypes.INVALID: {
        return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
      }
    }
  } else {
    const type = typeBTC(address);

    switch (type) {
      case BTCAddressTypes.P2PKH:
      case BTCAddressTypes.P2SH: {
        //invalid length
        if (25 > address.length || address.length > 34) {
          return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        }
        // contains invalid characters
        else if (BTC_BASE_58_DICT_regex.test(address)) {
          return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        }

        // Regex ensures that address can be decoded
        const decodedAddress = btcBase58.decode(address);

        // invalid length
        if (decodedAddress.length != 25) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        // checksum fails
        else if (!base58Checksum(decodedAddress)) {
          return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
          // wrong prefix
        } else if (!(decodedAddress[0] == 0 || decodedAddress[0] == 5)) return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
        else {
          const response = validAddressToResponse(address, false);
          return { status: VerificationStatus.OK, response };
        }
      }
      case BTCAddressTypes.SEGWIT: {
        const version = bech32Decode(address)?.version;
        if (version == 0) {
          // P2WPKH or P2WSH
          if (address.length == 42 || address.length == 62) {
            const response = validAddressToResponse(address, true);
            return { status: VerificationStatus.OK, response };
          } else return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };

          //P2TR
        } else if (version == 1) {
          const response = validAddressToResponse(address, true);
          return { status: VerificationStatus.OK, response };
        }
        // invalid address / unsupported version
        else return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
      }
      case BTCAddressTypes.INVALID: {
        return { status: VerificationStatus.OK, response: INVALID_ADDRESS_RESPONSE };
      }
    }
  }
}
