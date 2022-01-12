import * as winston from "winston";
import Transport from "winston-transport";

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
      case "info":
        color = "";
        break;
      case "error":
        color = BgRed + FgWhite;
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

    console.log(BgGray + FgBlack + info.timestamp.substring(11, 11 + 11) + Reset + " " + color + info.message + Reset);

    if (callback) {
      callback();
    }
  };
}

const myCustomLevels = {
  levels: {
    title: 20,
    group: 21,
    event: 10,
    debug: 8,
    info: 7,
    note: 5,
    warning: 4,
    error: 3,
    exception: 2,
    alert: 1,
  },
};

var globalLogger: winston.Logger;

export function createLogger(label?: string): winston.Logger {
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
  }) as winston.Logger & Record<keyof typeof myCustomLevels["levels"], winston.LeveledLogMethod>;
}

// return one instance of logger
export function getGlobalLogger(label?: string): winston.Logger {
  if (!globalLogger) {
    globalLogger = createLogger(label);
  }

  return globalLogger;
}
