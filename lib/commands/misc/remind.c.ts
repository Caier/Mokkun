import { group, aliases, register, CmdParams as c } from "../../util/cmdUtils";
import uuidv4 from 'uuid/v4';

const usage = `\`$premind add {gdzie (może być puste == tutaj)} {za ile? przykład: 1M30d24h60m} | {co przypomnieć}\` - tworzy przypomnienie\n
                \`$premind rem {id przypomnienia} - usuwa\`\n\`$premind list\` - listuje przypomnienia'`

@group("Przypomnienia")
class Handler {
    @aliases('rem')
    @register('Tworzenie i zarządzanie przypomnieniami', usage)
    static remind(msg: c.m, args: c.a, bot: c.b) {
        if(args[1] == "add") {
            let rem: any = {};
            
            rem.id = uuidv4();
            rem.author = msg.author.id;
            rem.authorLit = msg.author.tag;
            rem.createdAt = Date.now();
            rem.createdIn = msg.channel.id;
            rem.where = {};
            rem.content = bot.getArgs(msg.content, msg.prefix, "|").pop();

            let test = /((<@!?)|(<#))(?=[0-9]{18}(?=>$))/;

            rem.where.isUser = ((test.test(args[2]) && args[2].includes("@")) || msg.channel.type == 'dm') ? true : false;
            rem.where.channel = (test.test(args[2])) ? args[2].replace(/[\\<>@#&!]/g, "") : (msg.channel.type == 'dm') ? msg.author.id : msg.channel.id;
           
            let timeInc: any = {"M": 0, "d": 0, "h": 0, "m": 0};
            let timeTest = /([0-9]+[Mdhms]+)+/;
            let timeStr: any;

            if(timeTest.test(args[2]))
                timeStr = args[2];
            else if(timeTest.test(args[3]))
                timeStr = args[3];
            else
                return;

            for(let x of ["M", "d", "h", "m"])
            {
                if(timeStr.includes(x))
                {
                    let temp = timeStr.slice(0, timeStr.indexOf(x)).split("").reverse().join("").trim();

                    if(/[A-z]/.test(temp))
                        temp = temp.slice(0, temp.search(/[A-z]/g)).split("").reverse().join("");
                    else
                        temp = temp.split("").reverse().join("");
                
                    timeInc[x] += parseInt(temp);
                }
            }

            let milisInc = (timeInc["M"] * 2629743 + timeInc["d"] * 86400 + timeInc["h"] * 3600 + timeInc["m"] * 60) * 1000;

            rem.boomTime = Date.now() + milisInc;

            let applied = (rem.where.isUser) ? "@" + rem.where.channel : "#" + rem.where.channel;

            let embed = new bot.RichEmbed().setColor("#007F00").setDescription(`Ustawiono przypomienie w <${applied}>\nWiadomość: \`${rem.content}\`\nKiedy: \`${new Date(rem.boomTime)}\``).setFooter(`id: ${rem.id}`);
            
            let curRems = (bot.db.get(`System.reminders`) || [])
            curRems.push(rem);
            bot.db.save(`System.reminders`, curRems);

            msg.channel.send(embed);
        }

        else if(args[1] == "rem" && args[2] && /^[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i.test(args[2]))
        {
            bot.db.save(`System.reminders`, (bot.db.get(`System.reminders`) || []).filter((e: { id: string; }) => e.id != args[2]));
            msg.channel.send(bot.embgen("#007F00", "Usunięto przypomnienie"));
        }

        else if(args[1] == "list")
        {
            let ewe = ``;

            for(let x of (bot.db.get(`System.reminders`) || []).filter((r: { createdIn: string; where: { channel: import("discord.js").Guild; }; }) => r.createdIn == msg.channel.id || r.where.channel == msg.guild && msg.guild.id || msg.channel.id))
            {
                ewe += `\`${x.content}\`\n**Kiedy:** \`${new Date(x.boomTime).toLocaleString([], {timeZone: 'Europe/Warsaw'})}\`\n**w:** <${(x.where.isUser) ? "@" + x.where.channel : "#" + x.where.channel}>\n**id:** \`${x.id}\`\n\n`;
            }

            if(ewe.length < 1950)
                msg.channel.send(new bot.RichEmbed().setColor("#007F00").setDescription((ewe.length == 0) ? "Brak" : ewe));
            else
                msg.channel.send(ewe, {split: true});
        }
    }
}

export = Handler;