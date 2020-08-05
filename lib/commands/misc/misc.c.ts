import { aliases, register, CmdParams as c, group, permissions } from "../../util/cmdUtils";
import ax from 'axios';
import fs from 'fs';
import path from 'path';
import files from "../../util/misc/files";

@group('Różne')
class Handler {
    @aliases('p')
    @register('gra w ping ponga', '`$pping` - REEEE')
    static ping(msg: c.m, args: c.a, bot: c.b) {
        let wiad = (Math.floor(Math.random()*500) == 232) ? `nou` : `**${msg.author.tag}** :ping_pong: ${bot.ws.ping}ms`;
        msg.channel.send(new bot.RichEmbed().setColor("#1ece00").setDescription(wiad));
    }

    @register('Tworzy hiperłącze', '`$plink hide | {nazwa} | {link}` - tworzy hiperłącze nie pokazując jego twórcy\n`$plink {nazwa} | {link}` - to samo tylko z twórcą')
    static link(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 2);
        let embed = new bot.RichEmbed().setColor(Math.floor(Math.random()*16777215));
        if(args[1] == 'hide')
            embed.setTitle(args[2]).setURL(args[3]);
        else if(args[1])
            embed.setTitle(args[1]).setURL(args[2]).setFooter(msg.author.tag);
        else return;
        msg.delete({timeout: 150});
        msg.channel.send(embed);
    }

    @register('skraca linki za pomocą bitly.com', '`$pshorten {link do skrócenia}`')
    static async shorten(msg: c.m, args: c.a, bot: c.b) {
        if(!args[1]) return;
        let color = '#fade00';
        let resp = await ax.post("https://bitly.com/data/shorten", `url=${encodeURI(args[1])}`, {headers: {cookie: '_xsrf=0;', 'x-xsrftoken': 0}, responseType: 'json'});
        let body = resp.data, res = resp.status;
        if(res != 200) {msg.channel.send(bot.embgen(color, `Status code: ${res}`)); return}
        if(body.status_code == 200)
            msg.channel.send(new bot.RichEmbed().setColor(color).setTitle(body.data.anon_shorten.link).setDescription(args[1]));
        else 
            msg.channel.send(bot.embgen(color, `ERR: ${body.status_txt}`));
    }

    @aliases('h', '?')
    @register('pomoc', '`$phelp {nazwa komendy}`')
    static help(msg: c.m, args: c.a, bot: c.b) {
        let color = '#ffafee';
        if(args[1]) {
            if(!bot.commands.has(args[1])) {
                msg.channel.send(bot.emb("**Ta komenda nie istnieje**", color));
                return;
            }
            let cmd = bot.commands.get(args[1]);
            let emb = new bot.RichEmbed().setColor(color).setAuthor("Komenda: " + cmd.name)
            .setDescription(`**Opis:** ${cmd.description}\n\n**Używanie:** ${cmd.usage.replace(/\$p/g, msg.prefix)}`);
            cmd.aliases && emb.setDescription(emb.description + "\n\n**Aliasy:** " + `\`${cmd.aliases.join(", ")}\``);
            cmd.permissions && emb.setDescription(emb.description + `\n\n**Uprawnienia:** \`${cmd.permissions.join(', ')}\``);
            let flagi = [cmd.notdm && "__Nie można używac na PRIV__", cmd.ownerOnly && "__Dozwolone tylko dla ownera bota__"].filter(Boolean);
            flagi.length > 0 && emb.setDescription(emb.description + "\n\n" + flagi.join("\n"));
            msg.channel.send(emb);
            return;
        }
        
        let emb = new bot.RichEmbed().setAuthor("Lista komend").setColor(color);
        let groups: any = { ungrouped: [] };
        for(let cmd of bot.commands.array() as any) {
            if(cmd.group) {
                if(!groups[cmd.group]) groups[cmd.group] = [];
                groups[cmd.group].push(cmd);
            } else
                groups.ungrouped.push(cmd);
        }
        for(let group in groups) {
            if(groups[group].length == 0) continue;
            emb.addField(`**${group}**`, [...new Set(groups[group].map((cmd: any) => `\`${msg.prefix}${cmd.name}\` - ${cmd.description}`))].join('\n'));
        }
        emb.setDescription(`Aby dowiedzieć się więcej o danej komendzie wpisz \`${msg.prefix}help {nazwa komendy}\``);
        msg.channel.send(emb);
    }

    @aliases('sp')
    @register('wysyła załączniki jako spoiler', '`$pspoiler` - w załączniku dołącz plik (max. 8MB)')
    static async spoiler(msg: c.m, args: c.a, bot: c.b) {
        let attch = msg.attachments.array();

        if(attch[0] && attch[0].size > 8000000) msg.channel.send(bot.emb("**Załącznik max. 8MB**"));
        if(!attch[0] || attch[0].size > 8000000) return;
        
        let fname = `SPOILER_${attch[0].url.slice(attch[0].url.lastIndexOf("/") + 1)}`;
        let fpath = path.join(files.temp, fname);
        let fplace = fs.createWriteStream(fpath);

        msg.delete({timeout: 150});

        (await ax.get(attch[0].url, {responseType:'stream'})).data.on('data', (data: any) => fplace.write(data))
        .on('end', () => fplace.close());
        fplace.on("close", async () => {
            await msg.channel.send({files: [fpath]});
            fs.unlinkSync(fpath);
        });
    }
}

export = Handler;