import yargs from "yargs";
import { processColors } from "../../utils/logger";
import { Terminal } from "../../utils/terminal";

// Args parsing
const args = yargs
.command()
.option("filename", { alias: "f", type: "string", description: "Path to config json file", default: "", demand: false, })
.option("lines"   , { alias: "n", type: "number", description: "output the last NUM lines, instead of the last 10", default: 10, demand: false, })
.option("follow"  , { alias: "f", type: "boolean", description: "output appended data as the file grows", default: true, demand: false, })
.argv;


const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";

const FgBlack = "\x1b[30m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
const FgWhite = "\x1b[37m";
const FgGray = "\x1b[90m";

const BgBlack = "\x1b[40m";
const BgRed = "\x1b[41m";
const BgGreen = "\x1b[42m";
const BgYellow = "\x1b[43m";
const BgBlue = "\x1b[44m";
const BgMagenta = "\x1b[45m";
const BgCyan = "\x1b[46m";
const BgWhite = "\x1b[47m";
const BgGray = "\x1b[100m";

class ColorConsole2 {

    lastLog: string = "";
    lastLog2: string = "";
    duplicate = 0;

    mode: "" | "sticky" | "forgettable" = "";

    terminal: Terminal;

    constructor() {
        this.terminal = new Terminal(process.stderr);
    }

    log(info: any, callback: any) {
        let color = "";

        let ignore = false;

        switch (info.level) {
            case "title":
                color = BgWhite + FgBlack;
                break;
            case "group":
                color = BgGray + FgBlack;
                break;
            case "info":
                color = "";
                break;
            case "error2":
                color = BgRed + FgWhite;
                break;
            case "error":
                color = FgRed;
                break;
            case "warning":
                color = FgYellow;
                break;
            case "debug":
                color = FgBlue;
                break;
            case "debug1":
                color = FgBlack + BgGray;
                break;
            case "debug2":
                color = FgBlack + BgGray;
                break;
            case "debug3":
                color = FgBlack + BgGray;
                ignore = true;
                break;
        }

        //const memMb = round(process.memoryUsage().heapUsed / 1024 / 1024, 1);
        //const mem = BgBlue + FgBlack + `${memMb.toFixed(1).padStart(6, ' ')}` + Reset

        const mem = "";

        if (!ignore && info.message) {

            let text = info.message.toString();

            if (text[0] === '*' || text[0] === '!') {

                text = text.substring(1);

                if (this.mode) {
                    this.terminal.cursorRestore();
                    this.terminal.clearLine();
                } else {
                    this.terminal.cursorSave();
                }
                this.mode = text[0] === '*' ? "sticky" : "forgettable";
            }
            else {
                if (this.mode === "forgettable") {
                    this.terminal.cursorRestore();
                    this.terminal.clearLine();
                }

                this.mode = "";
            }


            if (this.lastLog === text) {
                this.duplicate++;
                process.stdout.write("\r" + BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + mem + ` ` + BgWhite + FgBlack + ` ${this.duplicate} ` + Reset);
            } else if (this.lastLog2 === text) {
                this.duplicate++;
                process.stdout.write("\r" + BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + mem + ` ` + BgWhite + FgBlack + ` ${this.duplicate}+ ` + Reset);
            }
            else {
                try {
                    if (this.duplicate > 0) {
                        console.log(``);
                    }
                    this.lastLog2 = this.lastLog;
                    this.lastLog = text;
                    this.duplicate = 0;

                    //            |           |
                    // "2022-01-10T13:13:07.712Z"

                    console.log(BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + mem + ` ` + color + processColors(text, color) + Reset);
                }
                catch { }
            }
        }

        if (callback) {
            callback();
        }

    };
}


function displayLine(colorConsole: ColorConsole2, data: string) {
    //console.log(data);

    // 123456789 123456789 123456789 123456789 123456789 
    // 2022-04-04T08:09:02.230Z  - global:[info]: roundManager initialize

    const pos0 = data.indexOf(' ');
    const pos1 = data.indexOf('[');
    const pos2 = data.indexOf(']');

    if (pos0 === -1 || pos1 === -1 || pos2 === -1) {
        console.log(data);
        return;
    }

    const info = {
        level: data.substring(pos1 + 1, pos2),
        message: data.substring(pos2 + 2),
        timestamp: data.substring(0, pos0)
    }

    //console.log( info );

    colorConsole.log(info, null);
}



function displayFile(filename: string, lines: number, displayTail: boolean) {

    const fs = require('fs');

    const colorConsole = new ColorConsole2();

    if (lines > 0) {
        let data = fs.readFileSync(filename).toString('utf-8'); {
            let textByLine = data.split("\n")
            for (let i = Math.max(0, textByLine.length - lines); i < textByLine.length; i++) {
                displayLine(colorConsole, textByLine[i]);
            }
        };
    }

    if (displayTail) {
        const Tail = require('tail').Tail;

        const tail = new Tail(filename);

        tail.on("line", function (data) { displayLine(colorConsole, data); });
    }
}

displayFile("logs/attester-global.log", (args as any).lines, (args as any).follow);
