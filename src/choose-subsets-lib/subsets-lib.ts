
const SUBGROUP_TO_BIG_ERROR = "Groups can ony have subgroups whose size is smaller or equal to original group's size";
const INVALID_HEX = "Incorrectly formatted hex strings";

export function unPrefix0x(tx: string) {
  if (!tx) {
    return "0x0";
  } else if (tx.startsWith("0x") || tx.startsWith("0X")) {
    return tx.slice(2);
  } else if (tx.startsWith("-0x") || tx.startsWith("-0X")) {
    return tx.slice(3);
  }
  return tx;
}

export function prefix0x(tx: string) {
  if (!tx) {
    return "0x0";
  } else if (tx.startsWith("0x") || tx.startsWith("0X") || tx.startsWith("-0x") || tx.startsWith("-0X")) {
    return tx
  }
  return "0x" + tx;
}

export function isPrefixed0x(tx: string) {
  if (!tx) {
    return false;
  } else if (tx.startsWith("0x") || tx.startsWith("0X") || tx.startsWith("-0x") || tx.startsWith("-0X")) {
    return true
  }
  return false;
}

export function isValidHexString(maybeHexString: string) {
  return /^(-)?(0x|0X)?[0-9a-fA-F]*$/i.test(maybeHexString);
}

/**
 * Pad hex string with zeros so they are of the desired length
 * @param hex hex string to pad
 * @param len desired length of hex string
 * @returns padded hex string
 */
export function padHexZeros(hex: string, len: number) {
  const hexA = unPrefix0x(hex);
  if (hexA.length > len) {
    return hex;
  }
  return prefix0x(hexA.padStart(len, "0"));
}

/**
 * AND function on two byte hex strings
 * @param hex1
 * @param hex2
 * @returns the AND of the two values
 */
export function hexStringAnd(hex1: string, hex2: string) {
  let h1 = unPrefix0x(hex1);
  let h2 = unPrefix0x(hex2);
  if (!(isValidHexString(h1) && isValidHexString(h2))) {
    throw new Error(INVALID_HEX);
  }
  if (h1.length !== h2.length) {
    const mLen = Math.max(h1.length, h2.length);
    h1 = h1.padStart(mLen, "0");
    h2 = h2.padStart(mLen, "0");
  }
  const buf1 = Buffer.from(h1, "hex");
  const buf2 = Buffer.from(h2, "hex");
  const bufResult = buf1.map((b, i) => b & buf2[i]);
  return prefix0x(Buffer.from(bufResult).toString("hex"));
}

/**
 * Count number of 1 in binary representation of hex string
 * @param hexString hex string
 * @returns number of 1s in bin representation
 */
export function countOnes(hexString: string) {
  if (!isValidHexString(hexString)) {
    throw new Error(INVALID_HEX);
  }
  const buf = Buffer.from(unPrefix0x(hexString), "hex");
  return buf.reduce((prev, curr) => {
    let s = 0;
    for (let i = 0; i < 8; i++) {
      s += curr % 2;
      curr = curr >> 1;
    }
    return prev + s;
  }, 0);
}

/**
 * Method that
 * - Calculates all subgroups of votes of size groupSize
 * - Compares their votes in each subgroup to get all votes everyone is aligned on
 * - Returns the vote that had the most positive votes, if there are many of those return the one that have higher priority in lexicographic order
 * @param votes array of hex string representing choose data
 * @param groupSize subgroup size
 * @returns
 */
export function chooseCandidate(votes: string[], groupSize: number): string {
  if (votes.length < groupSize) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }
  const allSubsets = getSubsetsOfSize(votes, groupSize);
  const candidates: [number, string][] = [];

  for (const subset of allSubsets) {
    let candidate = subset[0];
    for (const elem of subset) {
      candidate = hexStringAnd(candidate, elem);
    }
    const ones = countOnes(candidate);
    candidates.push([ones, candidate]);
  }
  candidates.sort();
  return prefix0x(candidates[candidates.length - 1][1]);
}

/**
 * Method that returns the array of all subsets of original array.
 *
 * << getSubsetsOfSize([1,2,3], 2);
 * >> [[1,2],[1,3],[2,3]]
 *
 * @param array set of which we want to get all subsets
 * @param size size of subsets we want
 * @returns array of arrays of all subsets of input array
 */
export function getSubsetsOfSize(array: any[], size: number) {
  if (array.length < size) {
    throw Error(SUBGROUP_TO_BIG_ERROR);
  }

  const result = [];

  function helper(arr: any[], splitIndex: number) {
    if (arr.length === size) {
      result.push(arr);
      return;
    }
    if (splitIndex + 1 > array.length) {
      return;
    }
    // We only want to explore the "tree" if we can find sufficient size elements down there
    const subtreeSizes = arr.length + array.length - splitIndex;
    if (subtreeSizes >= size) {
      helper(arr.concat(array[splitIndex]), splitIndex + 1);
      if (subtreeSizes > size) {
        helper(arr, splitIndex + 1);
      }
    }
  }

  helper([], 0);
  return result;
}
