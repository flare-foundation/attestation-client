import { getGlobalLogger } from "../utils/logger";
import { Terminal } from "../utils/terminal";
import { sleepms } from "../utils/utils";
import { MenuItem } from "./menuItem";
import { MenuItemBase } from "./menuItemBase";
import { MenuItemCommand } from "./menuItemCommand";

export class Menu {
  root: MenuItemBase;

  activeItem: MenuItemBase;

  terminal = new Terminal(process.stderr);

  done = false;

  onDisplay = () => {};

  constructor() {
    this.root = new MenuItemBase("", null);
    this.root.menu = this;

    this.activeItem = this.root;
  }

  addSubmenu(name: string): MenuItem {
    return this.add(new MenuItemBase(name, this.root));
  }
  addCommand(name: string, command: string): MenuItem {
    return this.add(new MenuItemCommand(name, command, this.root));
  }

  add(item: MenuItemBase): MenuItem {
    this.root.add(item);
    return new MenuItem(item);
  }

  navigate(item: MenuItemBase) {
    this.activeItem = item;
  }

  navigateBack() {
    if (!this.activeItem.itemParent) {
      return;
    }

    this.navigate(this.activeItem.itemParent);
  }

  refresh(newLocation = false) {
    //if( this.lastRefresh - getTimeMilli() < 500 ) return;

    this.display(newLocation);
  }

  display(newLocation = false) {
    if (newLocation) {
      this.terminal.cursorSave();
    } else {
      this.terminal.cursorRestore();
    }

    let a = 1;

    const logger = getGlobalLogger();

    logger.group(` Attestation Suite Admin                                 `);
    logger.info(`                                                         `);

    this.onDisplay();

    let path = this.activeItem.name;

    for (let prev = this.activeItem.itemParent; prev; prev = prev.itemParent) {
      if (prev.name != "") {
        path = `${prev.name}/${path}`;
      }
    }

    let back = "Back";
    if (this.root === this.activeItem) back = "Exit";
    logger.info(` ^w^R ${path}  ^^                                `);
    logger.info(` ^w^K 0 ^^^G ${back}                           `);

    for (const item of this.activeItem.items) {
      let sub = "";
      if (item.items.length > 0) {
        sub = "^w>^^";
        2;
      }
      logger.info(` ^w^K ${a} ^^ ${item.getDisplay()} ${sub}                       `);
      a++;
    }

    while (a < 10) {
      logger.info(` ^w^W ${a} ^^                                          `);
      a++;
    }

    logger.info(` `);
    this.terminal.clearLine();
  }

  static keys = [];
  static async startInputRead() {
    process.stdin.setRawMode(true);
    process.stdin.on("data", (data) => {
      const byteArray = [...data];
      if (byteArray.length > 0 && byteArray[0] === 3) {
        console.log("^C");
        process.exit(1);
      }
      Menu.keys.push(byteArray[0]);
    });
  }

  static clearKeys() {
    Menu.keys = [];
  }

  static isKey() {
    return Menu.keys.length > 0;
  }

  static getKey() {
    if (!Menu.isKey()) return -1;

    return Menu.keys.shift();
  }

  async waitForInputTimeout(timeout: number) {
    return await Promise.race([this.waitForInput(), sleepms(timeout)]);
  }

  async waitForInput(): Promise<number> {
    process.stdin.setRawMode(true);
    const res = await new Promise((resolve) => {
      process.stdin.once("data", (data) => {
        const byteArray = [...data];
        if (byteArray.length > 0 && byteArray[0] === 3) {
          console.log("^C");
          process.exit(1);
        }
        //
        process.stdin.setRawMode(false);
        resolve(byteArray[0]);
      });
    });

    return res as number;
  }

  processInput(key: number): boolean {
    const action = key - 49;

    if (action < -1) {
      return false;
    }

    if (action == -1) {
      if (this.root === this.activeItem) {
        this.done = true;
        return true;
      }

      this.navigateBack();
    } else {
      if (action < this.activeItem?.items.length) {
        this.activeItem.items[action].execute();
      }
    }

    return false;
  }

  async run() {
    this.display(true);

    while (!this.done) {
      this.display();

      const key = await this.waitForInput();

      if (this.processInput(key)) {
        return;
      }
    }
  }
}
