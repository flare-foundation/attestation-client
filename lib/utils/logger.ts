import * as winston from "winston";
import Transport from "winston-transport";
import { string } from "yargs";

const level = process.env.LOG_LEVEL || "info";

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

class ColorConsole extends Transport {
  instance = 0;

  log = (info: any, callback: any) => {
    setImmediate(() => this.emit("logged", info));

    let color = "";

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
    }

    //            |           |
    // "2022-01-10T13:13:07.712Z"

    console.log(BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + " " + color + processColors(info.message, color) + Reset);

    if (callback) {
      callback();
    }
  };
}

function replaceAll(text: string, search: string, replaceWith: string) : string {

  while( text.indexOf( search )>=0 ) {
    text = text.replace( search , replaceWith );
  }

  return text;
}

function processColors(text: string, def: string) {
  text = replaceAll(text , "^^", Reset + def);
  text = replaceAll(text , "^R", FgRed);
  text = replaceAll(text , "^G", FgGreen);
  text = replaceAll(text , "^B", FgBlue);
  text = replaceAll(text , "^Y", FgYellow);
  text = replaceAll(text , "^C", FgCyan);
  text = replaceAll(text , "^W", FgWhite);
  text = replaceAll(text , "^K", FgBlack);
  
  text = replaceAll(text , "^r", BgRed);
  text = replaceAll(text , "^g", BgGreen);
  text = replaceAll(text , "^b", BgBlue);
  text = replaceAll(text , "^y", BgYellow);
  text = replaceAll(text , "^c", BgCyan);
  text = replaceAll(text , "^w", BgWhite);

  return text;
}

const myCustomLevels = {
  levels: {
    debug: 100, // all above are filtered out when level is set to debug
    title: 80,
    group: 70,
    event: 50,
    info: 40,
    note: 39,
    warning: 20,
    error: 10,
    error2: 9,
    exception: 5,

    critical: 2,
    alert: 1,
  },
};

var globalLogger: AttLogger;

export interface AttLogger extends winston.Logger {
  title: (message: string) => null;
  group: (message: string) => null;
  event: (message: string) => null;
  note: (message: string) => null;
  error2: (message: string) => null;
  exception: (message: string) => null;

  critical: (message: string) => null;
}

export function createLogger(label?: string): AttLogger {
  return winston.createLogger({
    level: "debug",
    levels: myCustomLevels.levels,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.label({
        label,
      }),
      winston.format.printf((json: any) => {
        if (json.label) {
          return `${json.timestamp}  - ${json.label}:[${json.level}]: ${json.message}`;
        } else {
          return `${json.timestamp}[${json.level}]: ${json.message}`;
        }
      })
    ),
    transports: [
      new ColorConsole(),
      new winston.transports.File({
        level: "info",
        filename: `./logs/attester-${label}.log`,
      }),
    ],
  }) as AttLogger;
}

// return one instance of logger
export function getGlobalLogger(label?: string): AttLogger {
  if (!globalLogger) {
    globalLogger = createLogger(label);
  }

  return globalLogger;
}
