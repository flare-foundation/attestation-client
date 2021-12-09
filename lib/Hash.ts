import { sha3 } from "web3-utils";

export class Hash {

    static createHashString(data: string): number {

        sha3
        return parseInt(data, 10);
    }

    static createHash1(num1: number): number {
        return num1;
    }

    static createHash2(num1: number, num2: number): number {
        return num1 + num2;
    }


}