import { ColorConsole, getGlobalLogger, logException } from "../utils/logger";
import { sleepms } from "../utils/utils";
import { Menu } from "./menu";
import { MenuItemBase } from "./menuItemBase";

function displayLine(colorConsole: ColorConsole, data: string) {
  //console.log(data);

  // 123456789 123456789 123456789 123456789 123456789
  // 2022-04-04T08:09:02.230Z  - global:[info]: roundManager initialize

  const pos0 = data.indexOf(" ");
  const pos1 = data.indexOf("[");
  const pos2 = data.indexOf("]");

  if (pos0 === -1 || pos1 === -1 || pos2 === -1) {
    console.log(data);
    return;
  }

  const info = {
    level: data.substring(pos1 + 1, pos2),
    message: data.substring(pos2 + 2),
    timestamp: data.substring(0, pos0),
  };

  //console.log( info );

  colorConsole.log(info, null);
}

export class MenuItemLog extends MenuItemBase {
  filename = "";

  static working = false;

  constructor(name: string, filename: string, parent: MenuItemBase) {
    super(name, parent);

    this.filename = filename;
  }

  async displayFile(filename: string, lines: number, follow: boolean) {
    //console.log(filename);
    //console.log(lines);
    //console.log(follow);

    const fs = require("fs");
    const es = require('event-stream');

    const colorConsole = new ColorConsole();

    // if (lines > 0) {
    //   let data = fs.readFileSync(filename).toString("utf-8");
    //   {
    //     let textByLine = data.split("\n");
    //     for (let i = Math.max(0, textByLine.length - lines); i < textByLine.length; i++) {
    //       displayLine(colorConsole, textByLine[i]);
    //     }
    //   }
    // }


    if (lines > 0) {
      const textLines = [];

      const read = await new Promise((resolve, reject) => {

        const s = fs.createReadStream(filename)
          .pipe(es.split())
          .pipe(es.mapSync(function (line) {
            s.pause();
            textLines.push(line);
            if (textLines.length > lines) {
              textLines.shift();
            }
            s.resume();
          })
            .on('error', function (err) {
              console.log('Error while reading file.', err);
              reject();
            })
            .on('end', function () {
              console.log('Read entire file.')
              resolve(null);
            })
          );
      } );

      for (let i = 0; i < textLines.length; i++) {
        displayLine(colorConsole, textLines[i]);
      }
    }

    if (follow) {
      const Tail = require("tail").Tail;

      const tail = new Tail(filename);

      tail.on("line", function (data) {
        displayLine(colorConsole, data);
      });

      Menu.clearKeys();

      while (1) {
        await sleepms(100);

        if (Menu.isKey()) {
          tail.unwatch();
          break;
        }
      }
    }
  }

  async onExecute() {
    MenuItemLog.working = true;

    getGlobalLogger().group(`File '${this.filename}'                                                         `);

    try {
      await this.displayFile(this.filename, 100, true);
    } catch (error) {
      logException(error, "");
    }

    getGlobalLogger().group(` <file end>                                                                                     `);
    getGlobalLogger().info(`                                                                                         `);

    MenuItemLog.working = false;
  }
}
