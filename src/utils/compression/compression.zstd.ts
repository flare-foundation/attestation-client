import zstd from "@foxglove/wasm-zstd";

const enc = new TextEncoder(); // always utf-8
const dec = new TextDecoder(); // always utf-8

/**
 * Compress string data into base64 string.
 * @param data 
 * @returns compressed data as base64 string
 */
export function compressZstd(data: string): string {
    const compressedData = zstd.compress(enc.encode(data), 5);
    return compressedData.toString('base64');
}

/**
 * Decompress base64 string compressed with @Compress function back into source string.
 * @param compressedData base64 string compressed with @Compress function
 * @returns decompressed data as string
 */
export function decompressZstd(compressedData: string): string {
    const decompressedData = zstd.decompress(new Buffer(compressedData, 'base64'), compressedData.length * 100);
    return dec.decode(decompressedData);
}

/**
 * Compress string data into binary buffer.
 * @param data 
 * @returns compressed data as binary buffer
 */
export function compressZstdBin(data: string): Buffer {
    const compressedData = zstd.compress(enc.encode(data), 5);
    return compressedData;
}

/**
 * Decompress binary buffer compressed with @CompressBin function back into source string.
 * @param compressedDataBuffer binary data compressed with @CompressBin function
 * @returns decompressed data string
 */
export function decompressZstdBin(compressedDataBuffer: Buffer): string {
    const decompressedData = zstd.decompress(compressedDataBuffer, compressedDataBuffer.length * 100);
    return dec.decode(decompressedData);
}   
