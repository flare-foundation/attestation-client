import { sha3 } from "web3-utils";

export class Hash {

    static create(data: string): string {
        return sha3( data )!;
    }

}