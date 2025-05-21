const uuidv4 = require("uuid/v4");

module.exports = {
    name: 'remind',
    description: 'Tworzenie i zarządzanie przypomnieniami',
    usage: '\`$premind add {gdzie (może być puste == tutaj)} {za ile? przykład: 1M30d24h60m} | {co przypomnieć}\` - tworzy przypomnienie\n\`$premind rem {id przypomnienia} - usuwa\`\n\`$premind list\` - listuje przypomnienia',
    execute(msg, args, bot)
    {
        if(args[1] == "add")
        {
            rem = {};
            
            rem.id = uuidv4();
            rem.author = msg.author.id;
            rem.authorLit = msg.author.tag;
            rem.createdAt = Date.now();
            rem.createdIn = msg.channel.id;
            rem.where = {};
            rem.content = bot.getArgs(msg.content, msg.prefix, "|").slice(2);

            test = /((<@!?)|(<#))(?=[0-9]{18}(?=>$))/;

            rem.where.isUser = ((test.test(args[2]) && args[2].includes("@")) || msg.channel.type == 'dm') ? true : false;
            rem.where.channel = (test.test(args[2])) ? args[2].replace(/[\\<>@#&!]/g, "") : (msg.channel.type == 'dm') ? msg.author.id : msg.channel.id;
           
            timeInc = {"M": 0, "d": 0, "h": 0, "m": 0};
            timeTest = /([0-9]+[Mdhm]+)+/;

            if(timeTest.test(args[2]))
                timeStr = args[2];
            else if(timeTest.test(args[3]))
                timeStr = args[3];
            else
                return;

            for(x of ["M", "d", "h", "m"])
            {
                if(timeStr.includes(x))
                {
                    temp = timeStr.slice(0, timeStr.indexOf(x)).split("").reverse().join("").trim();

                    if(/[A-z]/.test(temp))
                        temp = temp.slice(0, temp.search(/[A-z]/g)).split("").reverse().join("");
                    else
                        temp = temp.split("").reverse().join("");
                
                    timeInc[x] += parseInt(temp);
                }
            }

            milisInc = (timeInc["M"] * 2629743 + timeInc["d"] * 86400 + timeInc["h"] * 3600 + timeInc["m"] * 60) * 1000;

            rem.boomTime = Date.now() + milisInc;

            applied = (rem.where.isUser) ? "@" + rem.where.channel : "#" + rem.where.channel;

            embed = new bot.RichEmbed().setColor("#007F00").setDescription(`Ustawiono przypomienie w <${applied}>\nWiadomość: \`${rem.content}\`\nKiedy: \`${new Date(rem.boomTime)}\``).setFooter(`id: ${rem.id}`);
            
            bot.db.System.reminders.push(rem);
            bot.db.save();

            msg.channel.send(embed);
        }

        else if(args[1] == "rem" && args[2] && /^[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i.test(args[2]))
        {
            bot.db.System.reminders = bot.db.System.reminders.filter(e => e.id != args[2]);
            bot.db.save();
            msg.channel.send(bot.embgen("#007F00", "Usunięto przypomnienie"));
        }

        else if(args[1] == "list")
        {
            let ewe = ``;

            for(x of bot.db.System.reminders.filter(r => r.createdIn == msg.channel.id || r.where.channel == msg.guild && msg.guild.id || msg.channel.id))
            {
                ewe += `\`${x.content}\`\n**Kiedy:** \`${new Date(x.boomTime)}\`\n**w:** <${(x.where.isUser) ? "@" + x.where.channel : "#" + x.where.channel}>\n**id:** \`${x.id}\`\n\n`;
            }

            if(ewe.length < 1950)
                msg.channel.send(new bot.RichEmbed().setColor("#007F00").setDescription((ewe.length == 0) ? "Brak" : ewe));
            else
                msg.channel.send(ewe, {split: true});
        }
        
    }
}