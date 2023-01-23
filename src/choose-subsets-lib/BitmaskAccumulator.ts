
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
         throw new Error("Bitmask too long")
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
            throw new Error(`Wrong character in bitstring ${bitString}`)
         }
      }
      result.length = bitString.length;
      result.count = this.length;
      return result;
   }

   public toHex() {
      return this.buffer.toString("hex");
   }

   /**
    * Calculate indices of bits in the bit accumulator, that are 0, but in the @param hexString they are 1.
    * Assumption: @param hexString converted to buffer is of at most length of the bytes in the bit accumulator
    * @param hexString
    */
   public missingIndices(hexString: string) {
      let buffer2 = Buffer.from(hexString, "hex");
      if (buffer2.length > this.buffer.length) {
         throw new Error("Buffer in the accumulator too short");
      }
      let indices = [];
      for (let i = 0; i < buffer2.length; i++) {
         let byte1 = this.buffer[i];
         let byte2 = buffer2[i];
         let tmpList = [];
         for (let pos = 7; pos >= 0; pos--) {
            const isMissing = !(byte1 % 2) && (byte2 % 2);
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
   }
}
