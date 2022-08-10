import Transport from "winston-transport";
export class TestLogger extends Transport {

    constructor() {
        super();
    }

    static logs = [];
    static clear() {
        TestLogger.logs = [];
    }
    static exists(text: string) : boolean {

        for( let logText of TestLogger.logs )
        {
            if( logText===text ) return true;
        }

        return false;
    }


    log = (info: any, callback: any) => {
        setImmediate(() => this.emit("logged", info));

        if (info.message) {
            let text = info.message.toString();

            TestLogger.logs.push(text);

            //console.log( text );
        }

        if (callback) {
            callback();
        }
    };
}
