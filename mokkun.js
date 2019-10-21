const Discord = require("discord.js");
const fs = require("fs-extra");
const path = require("path");
const ztm = require("./ztm");
const isOnline = require('is-online');

class Mokkun extends Discord.Client {
    constructor(vars = {}, color = "#FFFFFF") {
        super();
        this.sysColor = color;
        this.RichEmbed = Discord.RichEmbed;
        this.vars = Object.assign({}, process.env, vars);
        this._ensureVars();
        this._ensureDirs();
        this.db = this._getDatabase(this.vars.DB_PATH);
        this.commands = this._loadCommands();
        this._start();
    }

    _ensureVars() {
        let reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH"];
        let missingVars = reqVars.filter(env => typeof(this.vars[env]) === 'undefined')
        if(missingVars.length > 0)
            throw Error("Missing Required Env Vars: " + missingVars.join(", "));
    }

    _ensureDirs() {
        let dirs = [path.join(__dirname, "files", "temp"),
                    path.join(__dirname, "files", "global")];
        for(var dir of dirs)
            fs.ensureDirSync(dir);
    }

    _getDatabase(db_path) {
        if(!db_path) db_path = `files/temp/${new Date().toISOString().replace(/[^A-z0-9]/g, "")}.db`;
        let db = JSON.parse(fs.existsSync(path.join(__dirname, db_path)) && fs.readFileSync(path.join(__dirname, db_path)) || "{}");
        if(Object.entries(db).length == 0) {
            console.log("Starting with an empty database!");
            fs.writeFileSync(path.join(__dirname, db_path), "{}");
        }

        db.get = (query) => {
            query = query.split(".");
            let temp = db[query.shift()];
            for(var q of query)
                if(temp === undefined) 
                    break;
                else   
                    temp = temp[q];
            return temp;
        }
        db.save = (query, data) => {
            if(data === undefined)
                throw Error("Data parameter is required");
            query = query.split(".");
            let temp = db;
            for(var q of query.slice(0, -1)) {
                if(temp[q] === undefined) 
                    temp[q] = {};
                temp = temp[q]
            }
            temp[query.slice(-1)] = data;
            fs.writeFileSync(path.join(__dirname, db_path), JSON.stringify(db, null, 2));
        }

        return db;
    }

    _loadCommands() {
        let cmds = new Discord.Collection();
        let cmdir = path.join(__dirname, "commands");
        let cmdFiles = fs.readdirSync(cmdir).filter(f => f.endsWith(".js"));
        for(var cmdName of cmdFiles) {
            let cmdals = [cmdName.slice(0, -3)];
            let temp = require(path.join(cmdir, cmdName));
            if(temp.aliases)
                cmdals.push(...temp.aliases);
            for(var alias of cmdals)
                cmds.set(alias, temp)
        }
        return cmds;
    }

    _start() {
        this.login(this.vars.TOKEN);
        this.once("ready", () => this.setInterval(() => this._loops(), 30000));
        this.on("ready", () => this._onReady());
        this.on("message", msg => this._onMessage(msg));
        this.on("disconnect", () => this._reconnect());
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("reconnecting", () => console.log("Reconnecting to Discord..."));
    }

    _reconnect() {
        console.error("Kardynalny connecton with discord error, retrying in 30 seconds.");
        setTimeout(() => this.login(this.vars.TOKEN).catch(e => this.reconnect(e)), 30000);
    }

    _onReady() {
        console.log(`(re)Logged in as ${this.user.tag}`);
        if(this.db.System.presence) {
            this.user.setPresence({game: {name: this.db.System.presence.name, type: this.db.System.presence.type}});
        }
    }

    async _onMessage(msg) {
        let prefix = msg.guild && this.db.get(`Data.${msg.guild.id}.prefix`) || '.';
        msg.prefix = prefix;
        
        if(msg.content == '.resetprefix' && msg.guild && msg.member.permissions.has("MANAGE_GUILD")) {
            this.db.save(`Data.${msg.guild.id}.prefix`, ".");
            msg.channel.send(this.embgen(this.sysColor, 'Zresetowano prefix do "."'));
        }

        if(!msg.content.startsWith(prefix) || msg.author.bot) return;
        let args = this.getArgs(msg.content, prefix);
        try {
            if(this.commands.has(args[0])) {
                let cmd = this.commands.get(args[0]);
                if(cmd.ownerOnly && msg.author.id != this.vars.BOT_OWNER)
                    msg.channel.send(this.embgen(this.sysColor, "**Z tej komendy może korzystać tylko owner bota!**"));
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
            msg.channel.send(this.embgen(this.sysColor, `**Napotkano na błąd podczas wykonywania tej komendy :(**\n${err.message}`));
        }
    }

    async _loops() {
        if(!await isOnline({timeout: 500})) return;
        this._newsletter();
        this._reminders();
    }

    async _newsletter() {
        let prevRes = (fs.existsSync(path.join(__dirname, this.db.get(`System.files.prevRes`)))) ? fs.readFileSync(path.join(__dirname, this.db.get(`System.files.prevRes`))) : "{}";

        prevRes = JSON.parse(prevRes);
        let newsSubs = this.db.get(`System.newsSubs`);

        let news = await ztm.checkZTMNews();
        
        if(news.data_wygenerowania == prevRes.data_wygenerowania) return;

        for (var x of news.komunikaty)
        {
            let embed = new this.RichEmbed().setColor(13632027).setTitle(x.tytul).setDescription(x.tresc).setFooter(`Wygasa: ${x.data_zakonczenia}`);
            for(var c of newsSubs.users)
                this.users.get(c).send(embed);
            for(var c of newsSubs.channels)
                this.channels.get(c).send(embed)
        }

        fs.writeFileSync(path.join(__dirname, this.db.get(`System.files.prevRes`) || "files/temp"), JSON.stringify(news));
    }

    async _reminders() {
        let rems = this.db.get(`System.reminders`);

        for(var x of rems)
        {
            if(x.boomTime - Date.now() <= 0)
            {
                let embed = new this.RichEmbed().setColor("#007F00").setTitle("Przypomnienie").setDescription(x.content + `\n\n\nod: \`${x.authorLit}\``).setFooter(`id: ${x.id}`);
                let target = (x.where.isUser) ? "users" : "channels";
                this[target].get(x.where.channel).send(embed);
                rems = rems.filter(e => e.id != x.id);
                this.db.save(`System.reminders`, rems);
            }
        }
    }

    getArgs(content, prefix, splitter, freeargs = 1) {
        let msg = content.slice(prefix.length);
        if(!splitter) return msg.split(" ");

        let argtab = [];
        let spacecnt = 0;
        let wrdcur = "";

        for(var i = 0; i < msg.length; i++) {
            if(msg[i] === ' ' && (msg[i-1] === ' ' || msg[i-1] === splitter))
                continue;
            if(msg[i] != splitter) {
                if((msg[i] === ' ' && spacecnt >= freeargs) || msg[i] != ' ')
                    wrdcur += msg[i];
                else if(msg[i] === ' ' && spacecnt < freeargs) {
                    argtab.push(wrdcur);
                    wrdcur = "";
                    spacecnt += 1;
                }
            }
            else {
                argtab.push(wrdcur);
                wrdcur = "";
            }
        }

        if(wrdcur) argtab.push(wrdcur);
    
        return argtab;
    }

    embgen(color, content) {
        return new Discord.RichEmbed().setColor(color).setDescription(content);
    }

    async fetchMsgs(msg, much, user, before) {
        let msgs = await msg.channel.fetchMessages((before) ? {limit: 100, before: before} : {limit: 100});
        if(msgs.size == 0) return msgs;
        let fmsg = msgs.last().id;
        if(user) msgs = msgs.filter(e => e.author.id == user);
        if(msgs.size != 0) fmsg = msgs.last().id;
        while(msgs.size < much)
        {
            let temp = await msg.channel.fetchMessages({limit: 100, before: fmsg});
            if(temp.size != 0) fmsg = temp.last().id;
            else break;
            if(user) temp = temp.filter(e => e.author.id == user);
            msgs = msgs.concat(temp);
            if(temp.size != 0) fmsg = temp.last().id;
        }
        let cnt = 0;
        msgs = msgs.filter(() => {cnt++; return cnt <= much})
        return msgs;
    }
}

module.exports = Mokkun;

function promiseRejectionHandler() {
    process.on("unhandledRejection", err => 
        console.error("Unhandled Rejection: " + err.stack));
}

if(!module.parent) {
    promiseRejectionHandler();
    require("dotenv").config();
    new Mokkun();
}