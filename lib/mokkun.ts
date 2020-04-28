import Discord from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import isOnline from 'is-online';
import * as loops from './util/misc/loops';
import { MokkunMusic } from './util/music/lib/MokkunMusic';
import { SafeEmbed } from './util/embed/lib/SafeEmbed';
import { LoggedError } from './util/errors/lib/errors';
import { ICommand } from './util/interfaces/ICommand';

export class Mokkun extends Discord.Client {
    private reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH"];
    private reqDirs = [path.join(__dirname, '..', 'files', 'temp'),
                       path.join(__dirname, '..', 'files', 'global')];
    music = new MokkunMusic();
    loopExecCount = 0;
    RichEmbed = SafeEmbed;
    sysColor = '#FFFFFE';
    commands: Discord.Collection<string, ICommand>;
    vars: any;
    //db: Database

    constructor(vars?: object) {
        super();
        this.vars = Object.assign({}, process.env, vars);
        this.ensureVars();
        this.ensureDirs();
        this.db = //;
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

    private loadCommands() {

    }

    private start() {
        super.login(this.vars.TOKEN).catch(() => this.reconnect());
        this.once("ready", () => this.setInterval(() => this.loops(), 30000));
        this.on("ready", () => this.onReady());
        this.on("message", msg => this.onMessage(msg));
        this.on("shardDisconnect", () => this.reconnect());
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("shardReconnecting", () => console.log("Reconnecting to Discord..."));
    }

    private handleLoggedErrors() {
        process.on('unhandledRejection', err => {
            if(err instanceof LoggedError)
                err.channel?.send();
        });
    }

    private reconnect() {
        console.error('Fatal connection error with discord gateway, attepting to reconnect in 30 seconds');
        this.destroy();
        setTimeout(() => new Mokkun(this.vars), 30000);
    }

    private onReady() {

    }

    private async onMessage(msg: Discord.Message) {

    }

    private async loops() {
        if(!await isOnline({timeout: 500})) return;
        this.loopExecCount++;
        for(let loop in loops)
            (loops as any)[loop](this);
    }

    getArgs() {

    }

    embgen(content: string, color = this.sysColor, random: boolean) {
        return new SafeEmbed().setColor(!random ? color : Math.floor(Math.random() * 0xFFFFFF)).setDescription(content);
    }

    async fetchMsgs(msg: Discord.Message, much: number, user: string, before: string) {
        let msgs = await msg.channel.messages.fetch((before) ? {limit: 100, before: before} : {limit: 100});
        if(msgs.size == 0) return msgs;
        let fmsg = msgs?.last()?.id;
        if(user) msgs = msgs.filter(e => e.author.id == user);
        if(msgs.size != 0) fmsg = msgs?.last()?.id;
        while(msgs.size < much)
        {
            let temp = await msg.channel.messages.fetch({limit: 100, before: fmsg});
            if(temp.size != 0) fmsg = temp?.last()?.id;
            else break;
            if(user) temp = temp.filter(e => e.author.id == user);
            msgs = msgs.concat(temp);
            if(temp.size != 0) fmsg = temp?.last()?.id;
        }
        let cnt = 0;
        msgs = msgs.filter(() => {cnt++; return cnt <= much})
        return msgs;
    }

    parseTimeStrToMilis(timeStr: string) {
        if(!/([0-9]+[Mdhms]+)+/.test(timeStr)) 
            return -1;
        let timeInc = {"M": 0, "d": 0, "h": 0, "m": 0, "s": 0};
        for(let x of Object.keys(timeInc)) {
            if(timeStr.includes(x)) {
                let temp = timeStr.slice(0, timeStr.indexOf(x)).split("").reverse().join("").trim();
                if(/[A-z]/.test(temp))
                    temp = temp.slice(0, temp.search(/[A-z]/g)).split("").reverse().join("");
                else
                    temp = temp.split("").reverse().join("");
                (timeInc as any)[x] += +temp;
            }
        }
        return (timeInc["M"] * 2629743 + timeInc["d"] * 86400 + timeInc["h"] * 3600 + timeInc["m"] * 60 + timeInc["s"]) * 1000;
    }
}