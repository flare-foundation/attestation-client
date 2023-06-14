// yarn test test/utils/compression.test.ts

import { assert } from "chai";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";

import { compress, compressBin, decompress, decompressBin } from "../../src/utils/compression/compression.zlib";
import { getTestFile } from "../test-utils/test-utils";

// import zstd from "@foxglove/wasm-zstd";
// import { TextEncoder } from "util";
// import { TextDecoder } from "util";

const compressionTextData = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const compressionJsonData = `[
    {
        "name":"Andrea",
        "age":31,
        "gender":"Male",
        "skilled":true
    },
    {
        "name":"Eva",
        "age":27,
        "gender":"Female",
        "skilled":true
    },
    {
        "name":"Daniele",
        "age":26,
        "gender":"Male",
        "skilled":false
    }
]`;

describe(`Test compression utils (${getTestFile(__filename)})`, () => {

    before(async () => {
        initializeTestGlobalLogger();
    });

    // compression

    // it.only(`Compress string`, async () => {
    //     // const compressedData = compressSync(compressionJsonData);

    //     // const len0 = compressionJsonData.length;
    //     // const len1 = compressedData.length;

    //     // const decompressedData = decompressSync(compressedData);

    //     const enc = new TextEncoder(); // always utf-8
    //     const dec = new TextDecoder(); // always utf-8
        
    //     const compressedData = zstd.compress(enc.encode(compressionJsonData), 5);

    //     const len0 = compressionJsonData.length;
    //     const len1 = compressedData.length;

    //     const decompressedData = dec.decode(zstd.decompress(compressedData,compressedData.length));

    //     assert(decompressedData === compressionJsonData, `decompression does not work`);
    // });    

    it(`Compress string base64`, async () => {
        const compressedData = compress(compressionJsonData);

        const len0 = compressionJsonData.length;
        const len1 = compressedData.length;

        const decompressedData = decompress(compressedData);

        assert(decompressedData === compressionJsonData, `decompression does not work`);
    });    
    
    it(`Compress string raw`, async () => {
        const compressedData = compressBin(compressionJsonData);

        const len0 = compressionJsonData.length;
        const len1 = compressedData.byteLength;

        const decompressedData = decompressBin(compressedData);

        assert(decompressedData === compressionJsonData, `decompression does not work`);
    });

})
