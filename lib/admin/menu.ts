import { getTimeMilli } from "../utils/internetTime";
import { getGlobalLogger, logException } from "../utils/logger";
import { ServiceStatus } from "../utils/serviced";
import { Terminal } from "../utils/terminal";
import { sleepms } from "../utils/utils";


export class MenuItemBase {
    name: string = "";
    displayName: string = null;

    menu: Menu;

    items = [];
    parent: MenuItemBase;

    constructor(name: string, parent: MenuItemBase) {
        this.name = name;
        this.menu = parent?.menu;
        this.parent = parent;
    }

    refresh() {
        if (this.menu.activeItem === this.parent) {
            this.menu.refresh();
        }
    }


    addSubmenu(name: string): MenuItemBase {
        return this.add(new MenuItemBase(name, this));
    }

    addCommand(name: string, command: string): MenuItemBase {
        return this.add(new MenuItemCommand(name, command, this));
    }
    addService(name: string, serviceName: string): MenuItemBase {
        return this.add(new MenuItemService(name, serviceName, this));
    }
    getDisplay() {
        return this.displayName ? this.displayName : this.name;
    }

    add(item: MenuItemBase): MenuItemBase {
        this.items.push(item);

        return item;
    }

    async onExecute?();
    execute() {
        if (this.items != null && this.items.length > 0) {
            this.menu.navigate(this);
            return;
        }

        try {
            this.onExecute();
        }
        catch (error) { logException(error, "MenuBase::execute") }
    }
}

export class MenuItemCommand extends MenuItemBase {

    command: string;

    constructor(name: string, command: string, parent: MenuItemBase) {
        super(name, parent);
        this.command = command;
    }


    async onExecute() {

        getGlobalLogger().info(`execute ^g${this.command}^^`);

        let done = false;

        const { exec } = require("child_process");
        const execObj = exec(this.command);

        execObj.stdout.on('data', function (data) {
            console.log(data);
        });

        execObj.on('exit', function () {
            done = true;
        })

        // wait until exec is completed
        while (!done) {
            await sleepms(100);
        }

        getGlobalLogger().info('exec completed\n');
    }
}

type NewType = ServiceStatus;

export class MenuItemService extends MenuItemBase {

    serviceStatus: NewType;

    constructor(name: string, serviceName: string, parent: MenuItemBase) {
        super(name, parent);

        this.serviceStatus = new ServiceStatus(serviceName);

        this.displayName = `${name} ...`;

        this.serviceStatus.getStatus().then( (status)=>{
            this.displayName = `${this.name} ${status}`;

            this.refresh();
        }).catch( (error)=>{
            this.displayName = `${this.name} ^r${error}^^`;

            this.refresh();
        })
        //this.update();
    }

    async update() {
        let a = 0;
        while (1) {
            this.displayName = `${this.name} ${a}`;

            this.refresh();

            await sleepms(1000);
            a++;
        }
    }

    async onExecute() {
    }
}

export class Menu {
    root: MenuItemBase;

    activeItem: MenuItemBase;

    terminal = new Terminal(process.stderr);

    done = false;

    constructor() {
        this.root = new MenuItemBase("", null);
        this.root.menu = this;

        this.activeItem = this.root;
    }


    addSubmenu(name: string): MenuItemBase {
        return this.add(new MenuItemBase(name, this.root));
    }
    addCommand(name: string, command: string): MenuItemBase {
        return this.add(new MenuItemCommand(name, command, this.root));
    }

    add(item: MenuItemBase): MenuItemBase {
        this.root.add(item);
        return item;
    }

    navigate(item: MenuItemBase) {
        this.activeItem = item;
    }

    navigateBack() {
        if (!this.activeItem.parent) {
            return;
        }

        this.navigate(this.activeItem.parent);
    }

    lastRefresh = 0;

    refresh() {

        //if( this.lastRefresh - getTimeMilli() < 500 ) return;

        this.display();
    }

    display() {


        this.lastRefresh = getTimeMilli();

        this.terminal.cursorRestore();

        let a = 1;

        const logger = getGlobalLogger();

        logger.group(` Attestation Suite Admin                                 `);
        logger.info(`                                                         `);

        let path = this.activeItem.name;

        for (var prev = this.activeItem.parent; prev; prev = prev.parent) {
            if (prev.name != "") {
                path = `${prev.name}/${path}`;
            }
        }

        let back = "Back";
        if (this.root === this.activeItem) back = "Exit";
        logger.info(` ^w^R ${path}  ^^                                `);
        logger.info(` ^w^K 0 ^^^G ${back}                           `);

        for (let item of this.activeItem.items) {
            let sub = "";
            if (item.items.length > 0) {
                sub = "^w>^^"; 2
            }
            logger.info(` ^w^K ${a} ^^ ${item.getDisplay()} ${sub}                       `);
            a++;
        }

        while (a < 10) {
            logger.info(` ^w^W ${a} ^^                                          `);
            a++;
        }

        logger.info(` `);
    }

    async waitForInput(): Promise<number> {

        process.stdin.setRawMode(true)
        const res = await new Promise((resolve) => {
            process.stdin.once('data', data => {
                const byteArray = [...data]
                if (byteArray.length > 0 && byteArray[0] === 3) {
                    console.log('^C')
                    process.exit(1)
                }
                //
                process.stdin.setRawMode(false);
                resolve(byteArray[0]);
            })
        }
        );

        return res as number;
    }

    async run() {

        this.terminal.cursorSave();

        while (!this.done) {
            this.display();

            const key = await this.waitForInput();
            const action = key - 49;

            if (action < -1) {
                continue;
            }

            if (action == -1) {
                if (this.root === this.activeItem) {
                    return;
                }

                this.navigateBack();
            }
            else {
                if (action < this.activeItem?.items.length) {
                    this.activeItem.items[action].execute();
                }
            }
        }
    }
}