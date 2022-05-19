import { ColorConsole, getGlobalLogger, logException } from "../utils/logger";
import { Terminal } from "../utils/terminal";
import { sleepms } from "../utils/utils";

export class MenuItemBase {
    name: string = "";

    menu: Menu;

    items = [];
    parent: MenuItemBase;

    constructor(name: string, parent: MenuItemBase) {
        this.name = name;
        this.menu = parent?.menu;
        this.parent = parent;
    }

    addSubmenu(name: string): MenuItemBase {
        return this.add(new MenuItemBase(name, this));
    }

    addCommand(name: string, command: string): MenuItemBase {
        return this.add(new MenuItemCommand(name, command, this));
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

        execObj.stdout.on('data', function(data) {
            console.log(data); 
        });    

        execObj.on('exit', function() {
            done = true;
          })

        while( !done ) {
            await sleepms( 100 );
        }

        getGlobalLogger().info('exec completed\n');
    }
}

export class Menu {
    root: MenuItemBase;

    activeItem: MenuItemBase;

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

    display() {

        let a = 1;

        const logger = getGlobalLogger();

        logger.group(` Attestation Suite Admin                                 `);
        logger.info (`                                                         `);

        let path = this.activeItem.name;

        for( var prev = this.activeItem.parent; prev; prev=prev.parent) {
            if( prev.name!="" ) {
               path = `${prev.name}/${path}`;
            }
        }

        let back = "Back";
        if( this.root === this.activeItem ) back = "Exit";
        logger.info(` ^w^R ${path}  ^^                                `);
        logger.info(` ^w^K 0 ^^^G ${back}                           `);

        for (let item of this.activeItem.items) {
            let sub = "";
            if( item.items.length>0 ) {
                sub="^w>^^";2
            }
            logger.info(` ^w^K ${a} ^^ ${item.name} ${sub}                       `);
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

        const terminal = new Terminal(process.stderr);

        terminal.cursorSave();

        while (!this.done) {
            terminal.cursorRestore();

            this.display();

            const key = await this.waitForInput();
            const action = key - 49;

            if (action < -1) {
                continue;
            }

            if (action == -1) {
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