import { compressGzip, compressGzipBin, decompressGzip, decompressGzipBin } from "./compression.zlib";
import { compressZstd, compressZstdBin, decompressZstd, decompressZstdBin } from "./compression.zstd";


// tested:
// - deflate - default (1st tested)
// - [gzip] - ~10% better than deflate (10MB/sec) same speed as deflate
// - brotli - slow (0.5MB/sec), but very good compression (better than the rest)
// - zpack - input/output is object (not string) but in general very good for tables but bit usefull in our case
// - zstd - the same as GZip but has stupid limit that you need to know the size of the data before decompression

export enum CompressionType {
    Gzip = 'gzip',
    Zstd = 'zstd',
};

const DEFAULT_COMPRESSION_TYPE = CompressionType.Gzip;

/**
 * Compress string data into base64 string.
 * @param data 
 * @returns compressed data as base64 string
 */
export function compress(data: string, compressionType=DEFAULT_COMPRESSION_TYPE): string {
    switch( compressionType ) {
        case CompressionType.Gzip: return compressGzip(data);
        case CompressionType.Zstd: return compressZstd(data);
    }
}

/**
 * Decompress base64 string compressed with @Compress function back into source string.
 * @param compressedData base64 string compressed with @Compress function
 * @returns decompressed data as string
 */
export function decompress(compressedData: string, compressionType=DEFAULT_COMPRESSION_TYPE): string {
    switch( compressionType ) {
        case CompressionType.Gzip: return decompressGzip(compressedData);
        case CompressionType.Zstd: return decompressZstd(compressedData);
    }
}

/**
 * Compress string data into binary buffer.
 * @param data 
 * @returns compressed data as binary buffer
 */
export function compressBin(data: string, compressionType=DEFAULT_COMPRESSION_TYPE): Buffer {
    switch( compressionType ) {
        case CompressionType.Gzip: return compressGzipBin(data);
        case CompressionType.Zstd: return compressZstdBin(data);
    }
}

/**
 * Decompress binary buffer compressed with @CompressBin function back into source string.
 * @param compressedDataBuffer binary data compressed with @CompressBin function
 * @returns decompressed data string
 */
export function decompressBin(compressedDataBuffer: Buffer, compressionType=DEFAULT_COMPRESSION_TYPE): string {
    switch( compressionType ) {
        case CompressionType.Gzip: return decompressGzipBin(compressedDataBuffer);
        case CompressionType.Zstd: return decompressZstdBin(compressedDataBuffer);
    }
}   
