const setup =  require("../setup");
const fs =     require("fs");
const rp =     require("request-promise");
const iconv =  require("iconv-lite");
const config = require("../config.json");
const vars = config.settings.variables;

module.exports = {
    name: 'konta',
    description: 'alt konta lol nie dla psa',
    usage: '`konta nowe` - tworzy nową listę kont archiwizując stare, w załączniku wysyłasz listę kont w formacie `.txt`\n`konta listuj` - wysyła listę kont\n`konta usun {numer konta}` - usuwa z listy konto o podanym id\n`konta dodaj {email:hasło}` - dodaje konto na koniec listy\n`konta info {numer konta} | {wiadomość}` - dodaje do wybranego konta notatkę np. "HIV ban"',
    execute(msg, args)
    {
        function getKonta()
        {
            konta = fs.readFileSync(`${vars.konta}/${msg.channel.id}.txt`);
            return konta.toString().replace(/\r/g, "").replace(/\n/g, "").split(",");
        }

        function listuj()
        {
            konta = getKonta();
            out = "***Lista***:\n";

            for(x of konta)
            {
                temp = x.split("|");
                if(!temp[2])
                    out += `${temp[0]}. \`${temp[1]}\`\n`;
                else
                    out += `${temp[0]}. \`${temp[1]}\` ${temp[2]}\n`;
            }

            msg.channel.send(out, {split: true});
        }

   
        attch = msg.attachments.array();

        if(args[1] == "nowe")
        {
            if(attch[0] != undefined)
            {
                if(attch[0].url.endsWith(".txt"))
                {
                    file = rp(attch[0].url, {encoding: null}).then(file => {
                        konta = iconv.decode(new Buffer.from(file), "Windows-1250");
                        konta = konta.replace(/\r/g, "").replace(/\n/g, "").split(",");
                        out = "";

                        for(x = 0; x < konta.length; x++)
                            out += `${x}|${konta[x]},\r\n`;

                        out = out.slice(0, out.lastIndexOf(","));
                        fs.writeFileSync(`${vars.konta}/${msg.channel.id}.txt`, out);
                        msg.reply("Zapisano konta!").then(owo => {setup.deleteFew(msg, 2, 5000)});
                    });
                }
                else msg.channel.send(`od kiedy plik z kontami kończy się na ${attch[0].url.slice(attch[0].url.lastIndexOf("."))}\nbaka...`).then(owo => {setup.deleteFew(msg, 2, 5000)});
            }
            else msg.reply("Musisz wysłać załącznik!").then(owo => {setup.deleteFew(msg, 2, 5000)});
        }


        else if(args[1] == "lista")
        {
            listuj();
        }


        else if(args[1] == "usun" || args[1] == "dodaj")
        {
            if(args[2])
            {
                konta = getKonta();

                if(args[1] == "usun")
                {
                    index = 0;
                    for(x = 0; x < konta.length; x++)
                    {
                        temp = konta[x].split("|");
                        if(temp[0] == args[2])
                            index = x;
                    }
                    konta.splice(index, 1);
                    msg.channel.send(`Usunięto z listy konto ${args[2]}`);
                }
                else if(args[1] == "dodaj")
                {
                    args = setup.getArgs(msg.content, "|", 2);
                    last = konta[konta.length-1].split("|");
                    console.log(last);
                    if(last[0] == '') last[0] = "0";
                    konta.push(`${parseInt(last[0]) + 1}|${args[2]}`);
                    msg.channel.send(`Dodano do listy`);
                }

                fs.writeFileSync(`${vars.konta}/${msg.channel.id}.txt`, konta.join(",\r\n"));
                setTimeout(function(){
                    listuj();
                }, 500);
            }
        }


        else if(args[1] == "info")
        {
            args = setup.getArgs(msg.content, "|", 2);

            if(args[2])
            {
                if(args[3] == undefined)
                    args[3] = "";

                konta = getKonta();
                index = 0;
                for(x = 0; x < konta.length; x++)
                {
                    temp = konta[x].split("|");
                    if(temp[0] == args[2])
                    {
                        index = x;
                        break;
                    }
                }
                temp = konta[index].split("|");
                konta[index] = `${temp[0]}|${temp[1]}|${args[3]}`;
                fs.writeFileSync(`${vars.konta}/${msg.channel.id}.txt`, konta.join(",\r\n"));
                setTimeout(function(){
                    listuj();
                }, 500);
            }
        
    }
    }
}