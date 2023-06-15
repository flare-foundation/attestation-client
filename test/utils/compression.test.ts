// yarn test test/utils/compression.test.ts

import { assert } from "chai";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";

import { round } from "@flarenetwork/mcc";
import { CompressionType, compress, compressBin, decompress, decompressBin } from "../../src/utils/compression/compression";
import { getTestFile } from "../test-utils/test-utils";

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


    it(`Gzip compress string base64`, async () => {
        const compressedData = compress(compressionTextData, CompressionType.Gzip);

        const len0 = compressionJsonData.length;
        const len1 = compressedData.length;

        const decompressedData = decompress(compressedData, CompressionType.Gzip);

        assert(decompressedData === compressionTextData, `decompression does not work`);
    });

    it(`Gzip compress string raw`, async () => {
        const compressedData = compressBin(compressionJsonData, CompressionType.Gzip);

        const len0 = compressionJsonData.length;
        const len1 = compressedData.byteLength;

        console.info(`Gzip compression ratio ${round(len1 * 100 / len0, 1)}%`)

        const decompressedData = decompressBin(compressedData, CompressionType.Gzip);

        assert(decompressedData === compressionJsonData, `decompression does not work`);
    });

})
