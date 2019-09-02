const main = require("./mokkun");
const ztm =  require("./ztm");
const config = require("./config.json");
const vars = config.settings.variables;
const fs =     require("fs");

exports.setup = function()
{
    bot.on("ready", () => 
    {
        try {
            pres = fs.readFileSync(vars.presence).toString().split("|~|");
        } catch (err) {
            pres = ["Pico eating an ice cream", "WATCHING"];
        }

        bot.user.setPresence({game: {name: pres[0], type: pres[1]}});
        
        console.log(`Zalogowano jako ${bot.user.tag}`);
    });

    async function newsletter()                                                                                                                       //sprawdza i rozsyła sytuacją komunikacyną
    {
        let prevRes = (fs.existsSync(vars.prevRes)) ? fs.readFileSync(vars.prevRes) : "{}";

        prevRes = JSON.parse(prevRes);
        channels = config.settings.newsSubs.channels;
        users = config.settings.newsSubs.users;

        let news = await ztm.checkZTMNews();
        
        if(news.data_wygenerowania == prevRes.data_wygenerowania) return;

        for (var x of news.komunikaty)
        {
            let embed = new Discord.RichEmbed().setColor(13632027).setTitle(x.tytul).setDescription(x.tresc).setFooter(`Wygasa: ${x.data_zakonczenia}`);
            for (var c of channels)
                main.sendMsg('channel', c, embed);
            for (var u of users)
                main.sendMsg('user', u, embed);
        }

        fs.writeFileSync(vars.prevRes, JSON.stringify(news));
    }

    async function reminder()
    {
        let rems = fs.readdirSync(`./filespace`).filter(e => {return /[0-9]{18}/.test(e)});

        for(var z of rems)
        {
            let remList = (fs.existsSync(`./filespace/${z}/reminders.json`)) ? JSON.parse(fs.readFileSync(`./filespace/${z}/reminders.json`)) : "[]";

            for(var x of remList)
            {
                if(x.boomTime - Date.now() <= 0)
                {
                    let embed = new Discord.RichEmbed().setColor("#007F00").setTitle("Przypomnienie").setDescription(x.content + `\n\n\nod: \`${x.authorLit}\``).setFooter(`id: ${x.id}`);
                    let target = (x.where.isUser) ? "user" : "channel";
                    main.sendMsg(target, x.where.channel, embed);
                    remList = remList.filter(e => {return e.id != x.id;});
                    fs.writeFileSync(`./filespace/${z}/reminders.json`, JSON.stringify(remList));
                }
            }
        }
    }
    
    function loop()
    {
        newsletter();
        reminder();
    }

    setInterval(() => loop(), 30000);                                                                  
}

exports.getArgs = function(content, splitter, freeargs = 1)
{
    let msg = content.slice(process.env.PREFIX.length);
    if(!splitter) return msg.split(" ");

    let argtab = [];
    let spacecnt = 0;
    let wrdcur = "";

    for(var i = 0; i < msg.length; i++) {
        if(msg[i] === ' ' && (msg[i-1] === ' ' || msg[i-1] === splitter || msg[i+1] === splitter))
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
    
exports.embgen = function(color, content)
{
    return new Discord.RichEmbed().setColor(color).setDescription(content);
}

exports.updateConfig = async function(newConfig)
{
    if(!fs.existsSync("./config.json")) return;

    if(typeof(newConfig) == "string")
        fs.writeFileSync("./config.json", newConfig);
    else {
        newConfig = JSON.stringify(newConfig);
        fs.writeFileSync("./config.json", newConfig);
    }
}

exports.parseErr = function(err)
{
    console.error(err);
    main.sendMsg('user', '361575413744533504', `Wystąpił niespdziewany błąd, oto on:\n ${err}`);
}

exports.fetchMsgs = async function(msg, much, user, before)
{     
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
    msgs = msgs.filter(a => {cnt++; return cnt <= much})
    return msgs;
}
