import Discord, { Collection, TextChannel } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import isOnline from 'is-online';
import * as loops from './util/misc/loops';
import Util from './util/utils';
import { MokkunMusic } from './util/music/MokkunMusic';
import { SafeEmbed } from './util/embed/SafeEmbed';
import { LoggedError, SilentError } from './util/errors/errors';
import { ICommand, ICmdGroup } from './util/interfaces/ICommand';
import { IExtMessage } from './util/interfaces/DiscordExtended';
import Utils from './util/utils';
import { Database } from './util/database/Database';
import { IDatabase } from './util/database/IDatabaseData';
import { CmdParams as c } from './util/cmdUtils';
import files from './util/misc/files';

const __mainPath = process.cwd();

export let DB: IDatabase;

export class Mokkun extends Discord.Client {
    private reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH"];
    private reqDirs = [path.join(__mainPath, 'files', 'temp'),
                       path.join(__mainPath, 'files', 'global')];
    private cmdDir = path.join(__dirname, 'commands');
    private loopInterval = 3000;
    private guildScripts: Collection<string, (m: c.m, a: c.a, b: c.b) => void> = new Collection();
    loopExecCount = 0;
    music = new MokkunMusic(this);
    RichEmbed = SafeEmbed;
    sysColor = '#FFFFFE';
    commands: Collection<string, ICommand>;
    vars: any;
    db: IDatabase;

    constructor(vars?: object) {
        super();
        this.vars = Object.assign({}, process.env, vars);
        this.ensureVars();
        this.ensureDirs();
        this.db = Database.getInstance(this.vars.DB_PATH).DBinstance;
        DB = this.db;
        this.commands = this.loadCommands();
        this.loadGuildScripts();
        this.start();
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

    private loadCommands() {
        let cmds = new Collection<string, ICommand>();
        let cmdFiles = Util.dirWalk(this.cmdDir).filter(f => f.endsWith('.c.js'));
        for(let cmd of cmdFiles) {
            let temp = require(path.join(this.cmdDir, cmd)).default as ICmdGroup;
            for(let prop in temp) {
                if(!prop.startsWith("_")) continue;
                temp[prop].aliases = [temp[prop].name, ...(temp[prop].aliases || [])];
                for(let alias of temp[prop].aliases)
                    cmds.set(alias, temp[prop]);
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
        super.login(this.vars.TOKEN).catch(() => this.reconnect());
        this.once("ready", () => this.setInterval(() => this.loops(), this.loopInterval));
        this.on("ready", () => this.onReady());
        this.on("message", msg => this.onMessage(msg as IExtMessage));
        this.on("shardDisconnect", () => this.reconnect());
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("shardReconnecting", () => console.log("Reconnecting to Discord..."));
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
        let prefix = msg.guild && this.db.Data?.[msg.guild.id]?.prefix || '.';
        msg.prefix = prefix;
        msg.channel.data = this.db.Data?.[msg.channel.id];
        msg.guild && (msg.guild.data = this.db.Data?.[msg.guild.id]);
        let args = this.getArgs(msg.content, prefix);

        if(this.guildScripts.has(msg.guild?.id))
            this.guildScripts.get(msg.guild.id)(msg, args, this);

        if(msg.content == '.resetprefix' && msg.guild && msg.member.permissions.has("MANAGE_GUILD")) {
            this.db.save(`Data.${msg.guild.id}.prefix`, ".");
            msg.channel.send(this.emb('Zresetowano prefix do "."'));
        }

        if(!msg.content.startsWith(prefix) || msg.author.bot) return;
        if(msg.author.id != this.vars.BOT_OWNER && (msg.guild && (this.db.get(`Data.${msg.guild.id}.lockedComs`) || []).includes(args[0]) || (this.db.get(`Data.${msg.channel.id}.lockedComs`) || []).includes(args[0]))) {
            msg.channel.send(this.emb(`**Ta komenda została zablokowana na tym kanale/serwerze!**`));
            return;
        }

        await this.executeCommand(msg, args);
    }

    private async executeCommand(msg: IExtMessage, args: string[], commandScope = this.commands, helpPath: string[] = []) {
        const reason = (r: string) => msg.channel.send(this.emb(r));

        try {
            if(commandScope.has(args[0]) || commandScope.has('_')) {
                let cmd = commandScope.get(args[0]) || commandScope.get('_');
                if(cmd.deprecated)
                    reason("**Ta komenda została wyłączona**");
                else if(cmd.ownerOnly && msg.author.id != this.vars.BOT_OWNER)
                    reason("**Z tej komendy może korzystać tylko owner bota!**");
                else if(msg.guild && cmd.nsfw && !(msg.channel as TextChannel).nsfw)
                    reason("**Ten kanał nie pozwala na wysyłanie wiadomości NSFW!**");
                else if(cmd.notdm && msg.channel.type == 'dm')
                    reason("**Z tej komendy nie można korzystać na PRIV!**");
                else if(msg.guild && cmd.permissions && !cmd.permissions.every(perm => msg.member.permissionsIn(msg.channel).has(perm)))
                    reason(`**Nie posiadasz odpowiednich uprawnień:**\n${cmd.permissions.filter(p => !msg.member.permissionsIn(msg.channel).has(p)).join("\n")}`);
                else if(cmd.subcommandGroup)
                    await this.executeCommand(msg, args.slice(1), cmd.subcommands, helpPath.push(cmd.name) && helpPath);
                else 
                    await cmd.execute(msg, args, this);
            }
            else if(helpPath.length) {
                this.sendHelp(msg, helpPath);
            }
        }
        catch(err) {
            if(err instanceof SilentError || err instanceof LoggedError)
                return;
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

    newArgs(message: IExtMessage, options?: {splitter?: string, freeargs?: number, arrayExpected?: boolean}) {
        return this.getArgs(message.content, message.prefix, options?.splitter, options?.freeargs, options?.arrayExpected);
    }

    embgen(color: string | number = this.sysColor, content: string, random?: boolean) {
        return new SafeEmbed().setColor(!random ? color : Math.floor(Math.random() * 0xFFFFFF)).setDescription(content);
    }

    emb(content: string, color: string|number = this.sysColor, inAuthor?: boolean, random?: boolean) {
        return !inAuthor ? this.embgen(color, content, random) : this.embgen(color, content, random).setDescription('').setAuthor(content);
    }

    sendHelp(msg: IExtMessage, command: string | string[]) {
        this.commands.get('?').execute(msg, ['?', ...Array.isArray(command) ? command : [command]], this);
    }
}