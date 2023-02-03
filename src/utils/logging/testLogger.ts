import Transport from "winston-transport";
export class TestLogger extends Transport {

    constructor() {
        super();
    }

    static logs = [];

    static displayLog = 0;

    static setDisplay(display = 0) {
        TestLogger.displayLog = display;
    }

    static clear() {
        TestLogger.logs = [];
    }
    static exists(text: string): boolean {
        // optimize search if it becomes too slow
        for (const logText of TestLogger.logs) {
            if (logText === text) return true;
        }

        return false;
    }


    log = (info: any, callback: any) => {
        setImmediate(() => this.emit("logged", info));

        if (info.message) {
            const text = info.message.toString();

            TestLogger.logs.push(text);

            switch (TestLogger.displayLog) {
                // raw console output
                case 1: console.log(text); break;
                // todo: color output
                case 2: console.log(text); break;
            }
        }

        if (callback) {
            callback();
        }
    };
}
