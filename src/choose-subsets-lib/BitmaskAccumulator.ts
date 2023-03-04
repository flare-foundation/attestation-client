/**
 * Given a string of 0 and 1 it calculates the difference to the first greater or equal
 * divisor of 8.
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
 * against other hex-string representing a bit vector of the same length (if shorter, it
 * is considered to be padded by zeros.
 */
export class BitmaskAccumulator {
  length: number;
  buffer: Buffer;
  weight: number;
  index = 0;
  count = 0;

  /**
   * Constructs the bit accumulator ready to fill from start with given @param length.
   * @param length
   */
  constructor(length: number) {
    this.length = length;
    this.buffer = Buffer.alloc(Math.ceil(length / 8));
    this.index = 0;
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
   * @param hexString
   */
  public static fromHex(hexString: string) {
    let value = hexString;
    if (hexString.startsWith("0x")) {
      value = hexString.slice(2);
    }
    let bitmask = new BitmaskAccumulator(8);
    bitmask.buffer = Buffer.from(value, "hex");
    bitmask.length = (value.length + (hexString.length % 2)) / 2;
    bitmask.count = bitmask.length;
    return bitmask;
  }

  /**
   * Reads @param bitString, a string of '0' and '1' into accumulator and blocks it for
   * adding new bits.
   * @param bitString
   */
  public static fromBitString(bitString: string) {
    let result = new BitmaskAccumulator(bitString.length);
    for (let i = 0; i < bitString.length; i++) {
      if (bitString[i] === "1") {
        result.addBit(true);
      } else if (bitString[i] === "0") {
        result.addBit(false);
      } else {
        throw new Error(`Wrong character in bitstring ${bitString}`);
      }
    }
    result.length = bitString.length;
    result.count = result.length;
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

  public toHex() {
    return "0x" + this.buffer.toString("hex");
  }

  /**
   * Calculate indices of bits in the bit accumulator, that are 0, but in the @param hexString they are 1.
   * Assumption: @param hexString converted to buffer is of at most length of the bytes in the bit accumulator
   * @param value
   */
  public missingIndices(hexString: string) {
    let value = hexString;
    if (value.startsWith("0x")) {
      value = value.slice(2);
    }
    let buffer2 = Buffer.from(value, "hex");
    if (buffer2.length > this.buffer.length) {
      throw new Error("Buffer in the accumulator too short");
    }
    let indices = [];
    for (let i = 0; i < buffer2.length; i++) {
      let byte1 = this.buffer[i];
      let byte2 = buffer2[i];
      let tmpList = [];
      for (let pos = 7; pos >= 0; pos--) {
        const isMissing = !(byte1 % 2) && byte2 % 2;
        if (isMissing) {
          tmpList.push(8 * i + pos);
        }
        byte1 = byte1 >>> 1;
        byte2 = byte2 >>> 1;
      }
      for (let j = tmpList.length - 1; j >= 0; j--) {
        indices.push(tmpList[j]);
      }
    }
    return indices;
  }

  /**
   * Returns the sequence of indices implied by the bitmask in the accumulator. The maximal index is
   * of @param length - 1.
   * @param length
   */
  public toIndices(length: number): number[] {
    let indices = [];
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
    let indexByte = Math.floor(index / 8);
    for (let i = indexByte + 1; i < this.buffer.length; i++) {
      if (this.buffer[i] > 0) return true;
    }
    let byteValue = (this.buffer[indexByte] << index % 8) % 256;
    return byteValue > 0;
  }
}
