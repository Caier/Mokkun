import Discord, { TextChannel } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import isOnline from 'is-online';
import * as loops from './util/misc/loops';
import Util from './util/utils';
import { MokkunMusic } from './util/music/MokkunMusic';
import { SafeEmbed } from './util/embed/SafeEmbed';
import { LoggedError } from './util/errors/errors';
import { ICommand, ICmdGroup } from './util/interfaces/ICommand';
import { IExtMessage } from './util/interfaces/IExtMsg';
import Utils from './util/utils';

const __mainPath = process.cwd();

export class Mokkun extends Discord.Client {
    private reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH"];
    private reqDirs = [path.join(__mainPath, 'files', 'temp'),
                       path.join(__mainPath, 'files', 'global')];
    private cmdDir = path.join(__dirname, 'commands');
    private loopInterval = 3000;
    loopExecCount = 0;
    music = new MokkunMusic(this);
    RichEmbed = SafeEmbed;
    sysColor = '#FFFFFE';
    commands: Discord.Collection<string, ICommand>;
    vars: any;
    db: any;

    constructor(vars?: object) {
        super();
        this.vars = Object.assign({}, process.env, vars);
        this.ensureVars();
        this.ensureDirs();
        this.db = this.loadDatabase(this.vars.DB_PATH);
        this.commands = this.loadCommands();
        this.start();
        this.handleLoggedErrors();
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

    private loadDatabase(db_path: string) {
        if(!db_path) db_path = `files/temp/${new Date().toISOString().replace(/[^A-z0-9]/g, "")}.db`;
        let db = JSON.parse(fs.existsSync(path.join(__mainPath, db_path)) && fs.readFileSync(path.join(__mainPath, db_path)).toString() || "{}");
        if(Object.entries(db).length == 0) {
            console.log("Starting with an empty database!");
            fs.writeFileSync(path.join(__mainPath, db_path), "{}");
        }

        db.get = (query: any) => {
            query = query.split(".");
            let temp = db[query.shift()];
            for(let q of query)
                if(temp === undefined) 
                    break;
                else   
                    temp = temp[q];
            return temp;
        }
        db.save = (query: any, data: any) => {
            query = query.split(".");
            let temp = db;
            for(let q of query.slice(0, -1)) {
                if(temp[q] === undefined) 
                    temp[q] = {};
                temp = temp[q]
            }
            temp[query.slice(-1)] = data;
            fs.writeFileSync(path.join(__mainPath, db_path), JSON.stringify(db, null, 2));
        }
        
        return db;
    }

    private loadCommands() {
        let cmds = new Discord.Collection<string, ICommand>();
        let cmdFiles = Util.dirWalk(this.cmdDir).filter(f => f.endsWith('.c.js'));
        for(let cmd of cmdFiles) {
            let temp = require(path.join(this.cmdDir, cmd)) as any;
            if(typeof temp.description == 'string') {
                let cmdNames = [temp.name];
                temp.aliases && cmdNames.push(...temp.aliases);
                for(let alias of cmdNames)
                    cmds.set(alias, temp);
            } else {
                for(let prop in temp) {
                    if(!prop.startsWith("_")) continue;
                    temp[prop].aliases = [temp[prop].name, ...(temp[prop].aliases || [])];
                    for(let alias of temp[prop].aliases)
                        cmds.set(alias, temp[prop]);
                }
            }
        }
        return cmds;
    }

    private start() {
        super.login(this.vars.TOKEN).catch(() => this.reconnect());
        this.once("ready", () => this.setInterval(() => this.loops(), this.loopInterval));
        this.on("ready", () => this.onReady());
        this.on("message", msg => this.onMessage(msg));
        this.on("shardDisconnect", () => this.reconnect());
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("shardReconnecting", () => console.log("Reconnecting to Discord..."));
    }

    private handleLoggedErrors() {
        process.on('unhandledRejection', err => {
            if(err instanceof LoggedError)
                err.channel?.send(this.emb(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err.message}`));
        });
    }

    private reconnect() {
        console.error('Fatal connection error with discord gateway, attepting to reconnect in 30 seconds');
        this.destroy();
        setTimeout(() => new Mokkun(this.vars), 30000);
    }

    private onReady() {
        console.log(`(re)Logged in as ${this.user.tag}`);
        if(this.db.System.presence) {
            this.user.setActivity(this.db.System.presence.name, {type: this.db.System.presence.type.toUpperCase()});
        }
    }

    private async onMessage(msg: IExtMessage) {
        //🤡
        if(msg.guild?.id == '426486206671355914' && Utils.rand(0, 75) == 5)
            msg.react('🤡');

        let prefix = msg.guild && this.db.Data?.[msg.guild.id]?.prefix || '.';
        msg.prefix = prefix;

        if(msg.content == '.resetprefix' && msg.guild && msg.member.permissions.has("MANAGE_GUILD")) {
            this.db.save(`Data.${msg.guild.id}.prefix`, ".");
            msg.channel.send(this.emb('Zresetowano prefix do "."'));
        }

        if(!msg.content.startsWith(prefix) || msg.author.bot) return;
        let args = this.getArgs(msg.content, prefix);
        if(msg.author.id != this.vars.BOT_OWNER && (msg.guild && (this.db.get(`Data.${msg.guild.id}.lockedComs`) || []).includes(args[0]) || (this.db.get(`Data.${msg.channel.id}.lockedComs`) || []).includes(args[0]))) {
            msg.channel.send(this.emb(`**Ta komenda została zablokowana na tym kanale/serwerze!**`)).then(nmsg => this.setTimeout(() => nmsg.delete({timeout: 150}), 3000));
            return;
        }

        try {
            if(this.commands.has(args[0])) {
                let cmd = this.commands.get(args[0]);
                if(cmd.ownerOnly && msg.author.id != this.vars.BOT_OWNER)
                    msg.channel.send(this.embgen(this.sysColor, "**Z tej komendy może korzystać tylko owner bota!**"));
                else if(msg.guild && cmd.nsfw && !(msg.channel as TextChannel).nsfw)
                    msg.channel.send(this.emb("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**"));
                else if(cmd.notdm && msg.channel.type == 'dm')
                    msg.channel.send(this.embgen(this.sysColor, "**Z tej komendy nie można korzystać na PRIV!**"));
                else if(cmd.permissions && !cmd.permissions.every(v => msg.member.permissions.toArray().includes(v)))
                    msg.channel.send(this.embgen(this.sysColor, `**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !msg.member.permissions.toArray().includes(p)).join("\n")}`));
                else 
                    await cmd.execute(msg, args, this);
            }
        }
        catch(err) {
            console.error(`Error while executing command ${args[0]}: ${err.stack}`);
            msg.channel.send(this.emb(`**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err.message}`));
        }
    }

    private async loops() {
        if(!await isOnline({timeout: 500})) return;
        this.loopExecCount++;
        for(let loop in loops)
            (loops as any)[loop](this);
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

    newArgs(message: IExtMessage, options: {splitter?: string, freeargs?: number, arrayExpected?: boolean}) {
        return this.getArgs(message.content, message.prefix, options.splitter, options.freeargs, options.arrayExpected);
    }

    embgen(color: string | number = this.sysColor, content: string, random?: boolean) {
        return new SafeEmbed().setColor(!random ? color : Math.floor(Math.random() * 0xFFFFFF)).setDescription(content);
    }

    emb(content: string, color = this.sysColor, random?: boolean) {
        return this.embgen(color, content, random);
    }
}