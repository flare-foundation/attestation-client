import * as winston from "winston";
import Transport from "winston-transport";
import { Terminal } from "./terminal";
import { TestLogger } from "./testLogger";
import { round } from "./utils";

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

export class ColorConsole extends Transport {
  instance = 0;

  lastLog = "";
  lastLog2 = "";
  duplicate = 0;

  mode: "" | "sticky" | "forgettable" = "";

  terminal: Terminal;

  constructor() {
    super();

    this.terminal = new Terminal(process.stderr);
  }

  log = (info: any, callback: any) => {
    setImmediate(() => this.emit("logged", info));

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

    const memMb = round(process.memoryUsage().heapUsed / 1024 / 1024, 1);
    const mem = BgBlue + FgBlack + `${memMb.toFixed(1).padStart(6, " ")}` + Reset;

    //const mem = "";

    if (!ignore && info.message) {
      let text = info.message.toString();

      if (text[0] === "*" || text[0] === "!") {
        text = text.substring(1);

        if (this.mode) {
          this.terminal.cursorRestore();
          this.terminal.clearLine();
        } else {
          this.terminal.cursorSave();
        }
        this.mode = text[0] === "*" ? "sticky" : "forgettable";
      } else {
        if (this.mode === "forgettable") {
          this.terminal.cursorRestore();
          this.terminal.clearLine();
        }

        this.mode = "";
      }

      if (this.lastLog === text) {
        this.duplicate++;
        process.stdout.write(
          "\r" + BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + mem + ` ` + BgWhite + FgBlack + ` ${this.duplicate} ` + Reset
        );
      } else if (this.lastLog2 === text) {
        this.duplicate++;
        process.stdout.write(
          "\r" + BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + mem + ` ` + BgWhite + FgBlack + ` ${this.duplicate}+ ` + Reset
        );
      } else {
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
        } catch { }
      }
    }

    if (callback) {
      callback();
    }
  };
}

function replaceAll(text: string, search: string, replaceWith: string): string {
  try {
    while (text.indexOf(search) >= 0) {
      text = text.replace(search, replaceWith);
    }
  } catch { }

  return text;
}

export function processColors(text: string, def: string) {
  try {
    text = replaceAll(text, "^^", Reset + def);
    text = replaceAll(text, "^R", FgRed);
    text = replaceAll(text, "^G", FgGreen);
    text = replaceAll(text, "^B", FgBlue);
    text = replaceAll(text, "^Y", FgYellow);
    text = replaceAll(text, "^C", FgCyan);
    text = replaceAll(text, "^W", FgWhite);
    text = replaceAll(text, "^K", FgBlack);
    text = replaceAll(text, "^E", FgGray);

    text = replaceAll(text, "^r", BgRed);
    text = replaceAll(text, "^g", BgGreen);
    text = replaceAll(text, "^b", BgBlue);
    text = replaceAll(text, "^y", BgYellow);
    text = replaceAll(text, "^c", BgCyan);
    text = replaceAll(text, "^w", BgWhite);
    text = replaceAll(text, "^e", BgGray);
  } catch { }

  return text;
}

const myCustomLevels = {
  levels: {
    debug3: 103, // not displayed on console but logged
    debug2: 102,
    debug1: 101,
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

const globalLogger = new Map<string, AttLogger>();

let globalTestLogger: AttLogger = null;

let globalLoggerLabel;
let loggerName = "log";

export interface AttLogger extends winston.Logger {
  title: (message: string) => null;
  group: (message: string) => null;
  event: (message: string) => null;
  note: (message: string) => null;
  error2: (message: string) => null;
  exception: (message: string) => null;

  critical: (message: string) => null;
  debug1: (message: string) => null;
  debug2: (message: string) => null;
  debug3: (message: string) => null;
}

function createLogger(label?: string, test = false): AttLogger {

  var logPath = "./logs/";

  if (process.env.LOG_PATH) {
    logPath = `${process.env.LOG_PATH}/`;
  }

  const logFilename = `${logPath}${loggerName}-${label}.log`;

  return winston.createLogger({
    level: "debug3",
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
      test ? new TestLogger() : new ColorConsole(),
      new winston.transports.File({
        level: "debug2",
        filename: logFilename,
      }),
    ],
  }) as AttLogger;
}

export function setLoggerName(name: string) {
  loggerName = name;
}

export function setGlobalLoggerLabel(label: string) {
  globalLoggerLabel = label;
}

export function initializeTestGlobalLogger() {
  if (globalLogger.size || globalTestLogger) {
    console.error("initializeTestGlobalLogger must be called before any logger is created");
    // process.exit(3);
  }

  globalTestLogger = createLogger("@test", true);

  return globalTestLogger;
}

// return one instance of logger
export function getGlobalLogger(label?: string): AttLogger {
  if (globalTestLogger) return globalTestLogger;

  if (!label) {
    label = globalLoggerLabel;
  }

  if (!label) {
    label = "global";
  }

  let logger = globalLogger.get(label);

  if (!logger) {
    logger = createLogger(label);
    globalLogger.set(label, logger);
  }

  return logger;
}

export function logException(error: any, comment: string) {
  const logger = getGlobalLogger();

  logger.error2(`${comment} ${error}`);
  if (error.stack) {
    logger.error(error.stack);
  }
}
