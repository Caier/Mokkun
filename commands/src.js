const fs =    require("fs");
const rmf =   require("rimraf");
const dl =    require("download-file");
const zip =   require("nodeJs-zip");
const path =  require("path");

module.exports = {
    name: 'src',
    description: 'ściąga pliki źródłowe i dane bota',
    usage: '`$psrc ls` - wysyła listę plików w katalogu głównym bota\n`$psrc ls {ścieżka katalogu}` - wysyła listę plików w podanym katalogu\n`$psrc dl {ścieżka do pliku}` - wysyła podany plik, o ile plik nie jest oznaczony jako tajny\n`$psrc rm {ścieżka pliku}` - usuwa plik lub katalog, *tylko owner bota*\n`$psrc up` - wysyła plik do systemu plików bota - *tylko owner bota*',
    execute(msg, args, bot)
    {
        function thisEmbed(sdes)
        {
            if(!sdes)
                return new bot.RichEmbed().setColor("#4782b3");
            else   
                return new bot.RichEmbed().setColor("#4782b3").setDescription(sdes);
        }

        args = bot.getArgs(msg.content, msg.prefix, "|", 2);

        if(args[1] == "ls")
        {
            if(args[2] && !args[2].includes("..")) dir = `./${args[2]}/`;
            else dir = "./";

            try {files = fs.readdirSync(dir);}
            catch (err) {msg.channel.send(thisEmbed(err.message)); return;}

            for(x = 0; x < files.length; x++)
            {
                stats = fs.statSync(`${dir}${files[x]}`)
                    if(stats.isDirectory())
                        files[x] = `**(DIR)** ${files[x]}`;
            }

            files.sort();

            out = thisEmbed().setTitle(`**Pliki w katalogu ${dir}:**`);
            str = "";
            
            for(x of files)
                str += x + '\n';
                
            if(str.length < 2040)
            {
                out.setDescription(str);
                msg.channel.send(out);
            }
            else
                msg.channel.send(`**Pliki w katalogu ${dir}:**\n${str}`, {split: true});
        }

        else if(args[1] == "dl")
        {
            if(args[2] && !args[2].includes(".."))

                if((!args[2].includes("config.json") && !args[2].includes("srcsec")) || msg.author.id == config.botOwner)
                    msg.channel.send("", {file: `./${args[2]}`}).catch(err => {msg.channel.send(thisEmbed(err.message))});
                else return;

            else if(!args[2] && msg.author.id == config.botOwner)
            {
                filter = function(e){
                    return !e.includes("node_modules");
                }

                file = path.join(__dirname, "../");
                try 
                {
                    msg.channel.send(thisEmbed("Kompresowanie...")).then(msgg => {
                        zip.zip(file, {name: "mokkun-serv", filter: true}, filter);
                        msg.channel.send("", {file: `./mokkun-serv.zip`}).catch(err => {msg.channel.send(thisEmbed(err.message)); return;}).then(rwr => {
                            msgg.delete();
                            try {fs.unlinkSync("./mokkun-serv.zip");}
                            catch (err) {msg.channel.send(thisEmbed(err.message));}
                        });
                    });  
                } catch (err) {msg.channel.send(thisEmbed(err.message));}
            }
            else return;
        }

        else if(args[1] == "rm" && msg.author.id == config.botOwner)
        {
            if(args[2] && !args[2].includes("..") && !args[2].includes("./") && args[2].trim() != ".")
            {
                if(fs.existsSync(`./${args[2]}`))
                {
                    stats = fs.statSync(`./${args[2]}`);

                    if(!stats.isDirectory())
                        try {
                            fs.unlinkSync(`./${args[2]}`);
                            msg.channel.send(thisEmbed(`Usunięto plik ./${args[2]}`));
                        }
                        catch (err) {msg.channel.send(thisEmbed(err.message))}
                    else
                        try {
                            rmf.sync(`./${args[2]}`);
                            msg.channel.send(thisEmbed(`Usunięto katalog ./${args[2]}`));
                        }
                        catch (err) {msg.channel.send(thisEmbed(err.message))}
                }
            } 
            else return;
        }

        else if(args[1] == "up" && msg.author.id == config.botOwner)
        {
            attch = msg.attachments.array();

            if(attch[0] != undefined && args[2] && !args[2].includes(".."))
            {
                dl(attch[0].url, {directory: `./${args[2]}`, filename: `${attch[0].url.slice(attch[0].url.lastIndexOf("/"))}`}, err => {
                    if(err) msg.channel.send(thisEmbed(err.message));
                    msg.channel.send(thisEmbed("Wysłano plik"));
                });
            }
        }
    }
}