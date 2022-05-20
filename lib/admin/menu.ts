import { ColorConsole, getGlobalLogger, logException } from "../utils/logger";
import { EServiceStatus, ServiceStatus } from "../utils/serviced";
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

    refresh(newLocation = false) {
        if (this.menu.activeItem === this.parent) {
            this.menu.refresh(newLocation);
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
    addLog(name: string, filename: string): MenuItemBase {
        return this.add(new MenuItemLog(name, filename, this));
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

    static working = false;

    constructor(name: string, command: string, parent: MenuItemBase) {
        super(name, parent);
        this.command = command;
    }


    async onExecute() {

        getGlobalLogger().info(`execute ^g${this.command}^^`);

        MenuItemCommand.working=true;

        let done = false;

        const { exec } = require("child_process");
        const execObj = exec(this.command);

        execObj.stdout.on('data', function (data) {
            console.log(data.replace(/\n$/, ""));
        });

        execObj.on('exit', function () {
            done = true;
        })

        // wait until exec is completed
        while (!done) {
            await sleepms(100);
        }

        MenuItemCommand.working=false;

        getGlobalLogger().info('exec completed\n');

        this.refresh(true);
    }
}

type NewType = ServiceStatus;


export class MenuItemService extends MenuItemBase {

    serviceStatus: ServiceStatus;

    refreshing = false;

    static servicemMonitors = [];

    constructor(name: string, serviceName: string, parent: MenuItemBase) {
        super(name, parent);

        this.serviceStatus = new ServiceStatus(serviceName);

        MenuItemService.servicemMonitors.push( this.serviceStatus );

        this.updateStatus();

        this.addCommand( "Enable" , `systemctl --user enable ${name}` );
        this.addCommand( "Disable" , `systemctl --user disable ${name}` );
        this.addCommand( "Stop" , `systemctl --user stop ${name}` );
        this.addCommand( "Restart" , `systemctl --user restart ${name}` );
    }

    updateStatus() {
        if (this.refreshing) return;

        this.refreshing = true;

        this.displayName = `${this.name} ...`;

        this.serviceStatus.getStatus().then((status) => {
            //getGlobalLogger().debug( `MenuItemService status ${status}`)

            this.displayName = `${this.name} ^w^R${EServiceStatus[status]}^^`;
            this.refreshing = false;

            this.refresh();
        }).catch((error) => {
            //logException( error , `MenuItemService`);

            this.displayName = `${this.name} ^r${error}^^`;
            this.refreshing = false;

            this.refresh();
        })
    }

    async onExecute() {
        this.updateStatus();
        this.refresh();
    }
}

export class MenuItemLog extends MenuItemBase {

    filename: string ="";


    constructor(name: string, filename: string, parent: MenuItemBase) {
        super(name, parent);

        this.filename=filename;
    }

    displayLine(colorConsole: ColorConsole, data: string) {
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
    
    async displayFile(filename: string, lines: number, follow: boolean) {
        //console.log(filename);
        //console.log(lines);
        //console.log(follow);
    
        const fs = require('fs');
    
        const colorConsole = new ColorConsole();
    
        if (lines > 0) {
            let data = fs.readFileSync(filename).toString('utf-8'); {
                let textByLine = data.split("\n")
                for (let i = Math.max(0, textByLine.length - lines); i < textByLine.length; i++) {
                    this.displayLine(colorConsole, textByLine[i]);
                }
            };
        }
    
        if (follow) {
            const Tail = require('tail').Tail;
    
            const tail = new Tail(filename);
    
            tail.on("line", function (data) { this.displayLine(colorConsole, data); }).bind(this);

            while(1) {
                await sleepms( 100 );

                if( Menu.isKey() ) {
                    return;
                }
            }
        }
    }
    

    async onExecute() {
        await this.displayFile( this.filename , 100 , true );
    }
}



export class Menu {
    root: MenuItemBase;

    activeItem: MenuItemBase;

    terminal = new Terminal(process.stderr);

    done = false;

    onDisplay = ()=>{};

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

    refresh(newLocation = false) {

        //if( this.lastRefresh - getTimeMilli() < 500 ) return;

        this.display(newLocation);
    }

    display(newLocation = false) {

        if (newLocation) {
            this.terminal.cursorSave();
        }
        else {
            this.terminal.cursorRestore();
        }

        let a = 1;

        const logger = getGlobalLogger();

        logger.group(` Attestation Suite Admin                                 `);
        logger.info(`                                                         `);

        this.onDisplay();

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
        this.terminal.clearLine();
    }

    static keys = [];
    static async startInputRead() {
        process.stdin.setRawMode(true)
        process.stdin.on('data', data => {
            const byteArray = [...data]
            if (byteArray.length > 0 && byteArray[0] === 3) {
                console.log('^C')
                process.exit(1)
            }
            Menu.keys.push(byteArray[0]);
        });
    }

    static isKey() {
        return Menu.keys.length > 0;
    }

    static getKey() {
        if( !Menu.isKey() ) return -1;

        return Menu.keys.shift();
    }

    async waitForInputTimeout(timeout: number ) {
        return await Promise.race([this.waitForInput(), sleepms(timeout)]);
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
        }
        else {
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