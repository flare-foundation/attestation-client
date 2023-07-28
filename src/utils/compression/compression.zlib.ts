import * as zlib from "zlib";

/**
 * Compress string data into base64 string.
 * @param data 
 * @returns compressed data as base64 string
 */
export function compressGzip(data: string): string {
    return zlib.deflateSync(data, { level: 9 }).toString('base64');
}

/**
 * Decompress base64 string compressed with @Compress function back into source string.
 * @param compressedData base64 string compressed with @Compress function
 * @returns decompressed data as string
 */
export function decompressGzip(compressedData: string): string {
    return zlib.inflateSync(new Buffer(compressedData, 'base64')).toString();
}

/**
 * Compress string data into binary buffer.
 * @param data 
 * @returns compressed data as binary buffer
 */
export function compressGzipBin(data: string): Buffer {
    //return zlib.deflateSync(data, {level: 9});
    return zlib.gzipSync(data, { level: 9 });
    //return zlib.brotliCompressSync(data);
}

/**
 * Decompress binary buffer compressed with @CompressBin function back into source string.
 * @param compressedDataBuffer binary data compressed with @CompressBin function
 * @returns decompressed data string
 */
export function decompressGzipBin(compressedDataBuffer: Buffer): string {
    //return zlib.inflateSync(compressedDataBuffer).toString();
    return zlib.gunzipSync(compressedDataBuffer).toString();
    //return zlib.brotliDecompressSync(compressedDataBuffer).toString();
}   
