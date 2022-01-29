import Discord, { Collection, Intents, Message } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import Util from './util/utils';
import { MokkunMusic } from './util/music/MokkunMusic';
import { SafeEmbed } from './util/embed/SafeEmbed';
import { ICommand, ICmdGroup } from './util/interfaces/ICommand';
import { Database } from './util/database/Database';
import { IDatabase } from './util/database/IDatabaseData';
import { CmdParams as c } from './util/cmdUtils';
import files from './util/misc/files';
import BaseEventHandler from './events/BaseEventHandler';

const __mainPath = process.cwd();

export let DB: IDatabase;

export class Mokkun extends Discord.Client {
    private static instance: Mokkun;
    private reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH"];
    private reqDirs = [path.join(__mainPath, 'files', 'temp'),
                       path.join(__mainPath, 'files', 'global')];
    private cmdDir = path.join(__dirname, 'commands');
    guildScripts: Collection<string, (m: c.m, a: c.a, b: c.b) => void> = new Collection();
    music = new MokkunMusic(this);
    RichEmbed = SafeEmbed;
    sysColor = 0xFFFFFE;
    commands: Collection<string, ICommand>;
    vars: any;
    db: IDatabase;

    static getInstance(vars?: {[prop: string]: any}) {
        if(!this.instance)
            this.instance = new Mokkun(vars);
        return this.instance;
    }

    private constructor(vars?: {[prop: string]: any}) {
        super({ intents: Object.values(Intents.FLAGS) }); //politely fuck off
        this.vars = Object.assign({}, process.env, vars);
        this.ensureVars();
        this.ensureDirs();
        this.db = Database.getInstance(this.vars.DB_PATH).DBinstance;
        DB = this.db;
        this.loadEvents();
        this.commands = this.loadCommands();
        this.loadGuildScripts();
        this.start();
        import('./tasks');
    }

    private ensureVars() {
        let missVars = this.reqVars.filter(v => !this.vars[v]);
        if(missVars.length != 0)
            throw Error("Missing some requred variables: " + missVars.join(", "));
    }

    private ensureDirs() {
        for(let dir of this.reqDirs)
            fs.ensureDirSync(dir);
    }

    private async loadEvents() {
        for(let evF of Util.dirWalk(path.join(__dirname, 'events', 'handlers')).filter(f => f.endsWith('.e.js'))) {
            let handlers = await import(path.join(__dirname, 'events', 'handlers', evF));
            for(let H of Object.values(handlers) as typeof BaseEventHandler[])
                new H(this);
        }
    }

    private loadCommands() {
        let cmds = new Collection<string, ICommand>();
        let cmdFiles = Util.dirWalk(this.cmdDir).filter(f => f.endsWith('.c.js'));
        for(let cmd of cmdFiles) {
            let temp = require(path.join(this.cmdDir, cmd)).default as ICmdGroup;
            for(let prop in temp) {
                if(!prop.startsWith("_")) continue;
                temp[prop].aliases = [temp[prop].name, ...(temp[prop].aliases || [])];
                for(let alias of temp[prop].aliases) {
                    if(cmds.has(alias))
                        throw Error('Duplicated command alias: ' + alias);
                    cmds.set(alias, temp[prop]);
                }
            }
        }
        return cmds;
    }

    private loadGuildScripts() {
        if(!fs.existsSync(files.guildScripts))
            return;
        
        fs.readdirSync(files.guildScripts).forEach(s => 
            this.guildScripts.set(s.slice(0, -3), require(path.join(files.guildScripts, s))));
    }

    private start() {
        super.login(this.vars.TOKEN);
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("shardReconnecting", () => console.log("Reconnecting to Discord..."));
    }

    getArgs(content: any, prefix: string, splitter?: string, freeargs?: number, arrayExpected?: boolean) {
        content = content.slice(prefix.length);
        let args = [];
        if(splitter) 
            content = content.split(splitter);
        args.push(...(splitter ? content[0] : content).split(" ").map((v: string) => v.trim()).filter((v: string) => v != " " && v != ""));
        if(freeargs)
            args = [...args.slice(0,freeargs), args.slice(freeargs).join(" ")];
        if(splitter)
            args.push(...content.slice(1).map((v: string) => v.trim()));
        while(arrayExpected && args.some(v => v[0] == '[') && args.some(v => v[v.length-1] == ']')) {
            let beg = args.findIndex(v => v[0] == '[');
            let end: number = args.findIndex(v => v[v.length-1] == ']')+1;
            if(end <= beg) break;
            args = [...args.slice(0, beg), [...args.slice(beg, end).join("").split(",").map(v => v[0] == '[' && v.slice(1) || v).map(v => v.endsWith(']') && v.slice(0, -1) || v)], ...args.slice(end)];
        }
        return args;
    }

    newArgs(message: Message, options?: {splitter?: string, freeargs?: number, arrayExpected?: boolean}) {
        return this.getArgs(message.content, this.db.Data?.[message?.guild.id]?.prefix || '.', options?.splitter, options?.freeargs, options?.arrayExpected);
    }

    embgen(color: string | number = this.sysColor, content: string, random?: boolean) {
        if(typeof color == 'string')
            color = parseInt(color.slice(1), 16);
        return new SafeEmbed().setColor(!random ? color : Math.floor(Math.random() * 0xFFFFFF)).setDescription(content);
    }

    emb(content: string, color: string|number = this.sysColor, inAuthor?: boolean, random?: boolean) {
        return !inAuthor ? this.embgen(color, content, random) : this.embgen(color, content, random).setDescription('').setAuthor(content);
    }

    sendHelp(msg: Message, command: string | string[]) {
        this.commands.get('?').execute(msg, ['?', ...Array.isArray(command) ? command : [command]], this);
    }
}