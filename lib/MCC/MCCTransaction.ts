export class MCCTransaction {
    tx: string;
    metaData: any;

    constructor(tx: string, metaData: any = null) {
        this.tx = tx;
        this.metaData = metaData;
    }
}