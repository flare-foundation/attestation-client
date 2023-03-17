/**
 * Given a string of 0 and 1 it calculates the first length >= bitString.length
 * that is divisible by 8.
 * @param bitString
 * @returns
 */
export function padLength(bitString: string) {
  return (bitString.length % 8 ? 8 - (bitString.length % 8) : 0) + bitString.length;
}

/**
 * Pads the string of 0 and 1 with 0s on the right up to the length of the first divisor
 * of 8 that is greater or equal to the original length.
 * @param bitString
 * @returns
 */
export function padBitString(bitString: string) {
  return bitString.padEnd(padLength(bitString), "0");
}

/**
 * Helper class to manage bit vectors corresponding to arrays of true and false values.
 * Allows for sequential construction, conversion to Hex and comparison of missing values
 * against other hex-strings representing a bit vector of the same length (if shorter, it
 * is considered to be padded by zeros.
 */
export class BitmaskAccumulator {
  /**
   * Number of bits in the accumulator
   */
  length: number;
  /**
   * Buffer of bytes into which we sequentially store bits
   */
  buffer: Buffer;
  /**
   * The weight 2^i of the bit within the byte in the buffer which is the next to fill
   */
  weight: number;
  /**
   * Number of current byte with the next bit to fill
   */
  index = 0;
  /**
   * Number of bits that are already filled.
   */
  count = 0;

  /**
   * Constructs the bit accumulator ready to fill from start with given @param length.
   * @param length
   */
  constructor(length: number) {
    this.length = length;
    this.buffer = Buffer.alloc(Math.ceil(length / 8));
    this.index = 0;
    // weight of the rightmost bit in the byte
    this.weight = 128;
    this.count = 0;
  }

  /**
   * Adds a new bit to the end, if the accumulator did not reach the declared length
   * @param bit
   */
  addBit(bit: boolean) {
    if (this.count >= this.length) {
      throw new Error("Bitmask too long");
    }
    if (bit) {
      this.buffer[this.index] += this.weight;
    }
    if (this.weight === 1) {
      this.weight = 128;
      this.index++;
    } else {
      this.weight = this.weight >>> 1;
    }
    this.count++;
  }

  /**
   * Creates bitmask accumulator from hex string.
   * T
   * @param hexString
   */
  public static fromHex(hexString: string) {
    let value = hexString;
    if (hexString.startsWith("0x") || hexString.startsWith("0X")) {
      value = hexString.slice(2);
    }
    if (value.length % 2) {
      value += "0";
    }
    if (!/^[0-9A-Fa-f]+$/.test(value)) {
      throw new Error(`Invalid hex string '${hexString}'`);
    }
    const bitmask = new BitmaskAccumulator(0);
    bitmask.buffer = Buffer.from(value, "hex");
    const bytesUsed = Math.ceil(value.length / 2);
    bitmask.index = bytesUsed;
    bitmask.count = bytesUsed * 8;
    bitmask.length = bytesUsed * 8;
    bitmask.weight = 128;
    return bitmask;
  }

  /**
   * Reads @param bitString, a string of '0' and '1' into accumulator and blocks it for
   * adding new bits.
   * @param bitString
   */
  public static fromBitString(bitString: string) {
    if (!/^[01]*$/.test(bitString)) {
      throw new Error(`Invalid bit string '${bitString}'`);
    }
    const result = new BitmaskAccumulator(bitString.length);
    for (let i = 0; i < bitString.length; i++) {
      if (bitString[i] === "1") {
        result.addBit(true);
      } else if (bitString[i] === "0") {
        result.addBit(false);
      } else {
        // Should never happen
        throw new Error(`Wrong character in bit string ${bitString}`);
      }
    }
    return result;
  }

  /**
   * Returns the 8-padded string of 0s and 1s representing the bit mask
   * @returns
   */
  public toBitString() {
    let result = "";
    for (let i = 0; i < this.buffer.length; i++) {
      result += this.buffer[i].toString(2).padStart(8, "0");
    }
    return result;
  }

  /**
   * Returns byte padded hex representation of the accumulator.
   * @returns
   */
  public toHex() {
    return "0x" + this.buffer.toString("hex");
  }

  /**
   * Returns the sequence of indices implied by the bitmask in the accumulator. The maximal index is
   * of @param length - 1.
   * @param length
   */
  public toIndices(length: number): number[] {
    const indices = [];
    for (let i = 0; i < length; i++) {
      const index = Math.floor(i / 8);
      const offset = 8 - (i % 8) - 1;
      if ((this.buffer[index] >>> offset) % 2) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * Returns true if there is a 1 bit after index (included)
   * @param index
   * @returns
   */
  public hasActiveBitsBeyond(index: number) {
    if (index >= this.length) return false;
    const indexByte = Math.floor(index / 8);
    for (let i = indexByte + 1; i < this.buffer.length; i++) {
      if (this.buffer[i] > 0) return true;
    }
    const byteValue = (this.buffer[indexByte] << index % 8) % 256;
    return byteValue > 0;
  }
}
