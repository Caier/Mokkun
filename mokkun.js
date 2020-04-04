const Discord = require("discord.js");
const fs = require("fs-extra");
const path = require("path");
const isOnline = require('is-online');
const loops = require('./util/loops');
const { MokkunMusic } = require('./util/music/out/MokkunMusic.js');

class Mokkun extends Discord.Client {
    constructor(vars = {}, color = "#FFFFFE") {
        super();
        this.music = new MokkunMusic();
        this.sysColor = color;
        this.RichEmbed = Discord.MessageEmbed;
        this.vars = Object.assign({}, process.env, vars);
        this._ensureVars();
        this._ensureDirs();
        this.db = this._getDatabase(this.vars.DB_PATH);
        this.commands = this._loadCommands();
        this._start();
    }

    _ensureVars() {
        let reqVars = ["TOKEN", "BOT_OWNER", "DB_PATH", "SC_CLIENT_ID"];
        let missingVars = reqVars.filter(env => typeof(this.vars[env]) === 'undefined')
        if(missingVars.length > 0)
            throw Error("Missing Required Env Vars: " + missingVars.join(", "));
    }

    _ensureDirs() {
        let dirs = [path.join(__dirname, "files", "temp"),
                    path.join(__dirname, "files", "global")];
        for(let dir of dirs)
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
            for(let q of query)
                if(temp === undefined) 
                    break;
                else   
                    temp = temp[q];
            return temp;
        }
        db.save = (query, data) => {
            query = query.split(".");
            let temp = db;
            for(let q of query.slice(0, -1)) {
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
        for(let cmdName of cmdFiles) {
            let cmdals = [cmdName.slice(0, -3)];
            let temp = require(path.join(cmdir, cmdName));
            if(temp.aliases)
                cmdals.push(...temp.aliases);
            for(let alias of cmdals)
                cmds.set(alias, temp)
        }
        return cmds;
    }

    _start() {
        this.login(this.vars.TOKEN);
        this.once("ready", () => this.setInterval(() => this._loops(), 30000));
        this.on("ready", () => this._onReady());
        this.on("message", msg => this._onMessage(msg));
        this.on("shardDisconnected", () => this._reconnect());
        this.on("error", err => console.error("Websocket error: " + err.message));
        this.on("shardReconnecting", () => console.log("Reconnecting to Discord..."));
    }

    _reconnect() {
        console.error("Kardynalny connecton with discord error, retrying in 30 seconds.");
        setTimeout(() => this.login(this.vars.TOKEN).catch(e => this.reconnect(e)), 30000);
    }

    _onReady() {
        console.log(`(re)Logged in as ${this.user.tag}`);
        if(this.db.System.presence) {
            this.user.setActivity(this.db.System.presence.name, {type: this.db.System.presence.type.toUpperCase()});
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
        if(msg.author.id != this.vars.BOT_OWNER && (msg.guild && (this.db.get(`Data.${msg.guild.id}.lockedComs`) || []).includes(args[0]) || (this.db.get(`Data.${msg.channel.id}.lockedComs`) || []).includes(args[0]))) {
            msg.channel.send(this.embgen(this.sysColor, `**Ta komenda została zablokowana na tym kanale/serwerze!**`)).then(nmsg => this.setTimeout(() => nmsg.delete({timeout: 150}), 3000));
            return;
        }
        
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
        for(let loop in loops)
            loops[loop](this);
    }

    getArgs(content, prefix, splitter, freeargs, arrayExpected) {
        content = content.slice(prefix.length);
        let args = [];
        if(splitter) 
            content = content.split(splitter);
        args.push(...(splitter ? content[0] : content).split(" ").map(v => v.trim()).filter(v => v != " " && v != ""));
        if(freeargs)
            args = [...args.slice(0,freeargs), args.slice(freeargs).join(" ")];
        if(splitter)
            args.push(...content.slice(1).map(v => v.trim()));
        while(arrayExpected && args.some(v => v[0] == '[') && args.some(v => v[v.length-1] == ']')) {
            let beg = args.findIndex(v => v[0] == '[');
            let end = args.findIndex(v => v[v.length-1] == ']')+1;
            if(end <= beg) break;
            args = [...args.slice(0, beg), [...args.slice(beg, end).join("").split(",").map(v => v[0] == '[' && v.slice(1) || v).map(v => v.endsWith(']') && v.slice(0, -1) || v)], ...args.slice(end)];
        }
        return args;
    }

    embgen(color = Math.floor(Math.random() * 16777215), content) {
        return new Discord.MessageEmbed().setColor(color).setDescription(content);
    }

    async fetchMsgs(msg, much, user, before) {
        let msgs = await msg.channel.messages.fetch((before) ? {limit: 100, before: before} : {limit: 100});
        if(msgs.size == 0) return msgs;
        let fmsg = msgs.last().id;
        if(user) msgs = msgs.filter(e => e.author.id == user);
        if(msgs.size != 0) fmsg = msgs.last().id;
        while(msgs.size < much)
        {
            let temp = await msg.channel.messages.fetch({limit: 100, before: fmsg});
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

    parseTimeStrToMilis(timeStr) {
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
                timeInc[x] += +temp;
            }
        }
        return (timeInc["M"] * 2629743 + timeInc["d"] * 86400 + timeInc["h"] * 3600 + timeInc["m"] * 60 + timeInc["s"]) * 1000;
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