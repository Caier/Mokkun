const setup = require("../setup");
const uuidv4 = require("uuid/v4");
const fs = require("fs");
const config = require("../config.json");
const vars = config.settings.variables;

module.exports = {
    name: 'remind',
    description: 'Tworzenie i zarządzanie przypomnieniami',
    usage: '\`remind add {gdzie (może być puste == tutaj)} {za ile? przykład: 1M30d24h60m} | {co przypomnieć}\` - tworzy przypomnienie\n\`remind rem {id przypomnienia} - usuwa\`\n\`remind list\` - listuje przypomnienia',
    execute(msg, args)
    {
        if(msg.channel.type == 'dm')
        {
            msg.channel.send("Niestety nie można korzystać z tej komendy na PRIV");
            return;
        }

        if(fs.existsSync(`${vars.reminders}/${msg.guild.id}/reminders.json`))
            remFile = JSON.parse(fs.readFileSync(`${vars.reminders}/${msg.guild.id}/reminders.json`).toString());
        else
        { 
            fs.writeFileSync(`${vars.reminders}/${msg.guild.id}/reminders.json`, "[]");
            remFile = [];
        }

        if(args[1] == "add")
        {
            rem = {};
            
            rem.id = uuidv4();
            rem.author = msg.author.id;
            rem.authorLit = msg.author.tag;
            rem.createdAt = Date.now();
            rem.where = {};
            rem.content = setup.getArgs(msg.content, "|").slice(2);

            test = /((<@!?)|(<#))(?=[0-9]{18}(?=>$))/;

            rem.where.isUser = ((test.test(args[2]) && args[2].includes("@")) || msg.channel.type == 'dm') ? true : false;
            rem.where.channel = (test.test(args[2])) ? args[2].replace(/[\\<>@#&!]/g, "") : msg.channel.id;
           
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

            embed = new Discord.RichEmbed().setColor("#007F00").setDescription(`Ustawiono przypomienie w <${applied}>\nWiadomość: \`${rem.content}\`\nKiedy: \`${new Date(rem.boomTime)}\``).setFooter(`id: ${rem.id}`);
            
            remFile.push(rem);

            try {
               fs.writeFileSync(`${vars.reminders}/${msg.guild.id}/reminders.json`, JSON.stringify(remFile));
               msg.channel.send(embed);
            } catch (e) {
               msg.channel.send(e.message);
            }

            console.log(rem);
        }
        else if(args[1] == "rem" && args[2] && /^[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i.test(args[2]))
        {
            remFile = remFile.filter(e => {return e.id != args[2];});
            fs.writeFileSync(`${vars.reminders}/${msg.guild.id}/reminders.json`, JSON.stringify(remFile));
            msg.channel.send("Usunięto");
        }
        else if(args[1] == "list")
        {
            ewe = ``;

            for(x of remFile)
            {
                ewe += `\`${x.content}\`\n**Kiedy:** \`${new Date(x.boomTime)}\`\n**id:** \`${x.id}\`\n\n`;
            }

            if(ewe.length < 1950)
                msg.channel.send(new Discord.RichEmbed().setColor("#007F00").setDescription(ewe));
            else
                msg.channel.send(ewe, {split: true});
        }
        
    }
}