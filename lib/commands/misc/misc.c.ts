import { aliases, register, CmdParams as c, group, deprecated } from "../../util/cmdUtils";
import ax from 'axios';
import fs from 'fs';
import path from 'path';
import files from "../../util/misc/files";
import { ICommand } from "../../util/interfaces/ICommand";

@group('Różne')
export default class {
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

    @deprecated
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
        const color = '#ffafee';
        const listCmds = (c?: ICommand, path?: string, cmds?: ICommand[], mName?: string) => new bot.RichEmbed().setColor(color)
            .setAuthor(mName ? 'Moduł: ' + mName : c.subcommandGroup ? 'Grupa Komend: ' + path : 'Komenda: ' + path)
            .setDescription(`Aby dowiedzieć się więcej o danej komendzie wpisz \`${msg.prefix}help {nazwa komendy}\`\n\n`
            + cmds.map(c => (c.deprecated ? '~~' : '') + `\`${msg.prefix}${path ? path + ' ' : ''}${c.name}\` - ${c.description}` + (c.subcommandGroup ? ' `[Grupa Komend]`' : '') + (c.deprecated ? '~~  `wyłączona`' : '')).join('\n'));

        let groups: {[prop: string]: ICommand[]} = { Inne: [] };
        for(let cmd of bot.commands.array()) {
            if(cmd.group) {
                if(!groups[cmd.group]) groups[cmd.group] = [];
                !groups[cmd.group].find(c => c.name == cmd.name) && groups[cmd.group].push(cmd);
            } else
                !groups.Inne.find(c => c.name == cmd.name) && groups.Inne.push(cmd);
        }

        if(args[1] && Object.keys(groups).map(k => k.toLowerCase()).includes(args[1].toLowerCase())) {
            let module = Object.entries(groups).find(e => e[0].toLowerCase() == args[1].toLowerCase()) as [string, ICommand[]];
            msg.channel.send(listCmds(undefined, undefined, module[1], module[0]));
        }
        else if(args[1] && bot.commands.has(args[1])) {
            let cmd: ICommand, scope = bot.commands, path: string[] = [];
            for(let deep of args.slice(1)) {
                if(scope.has(deep)) {
                    cmd = scope.get(deep);
                    path.push(cmd.name);
                    cmd.subcommandGroup && (scope = cmd.subcommands);
                }
                else {
                    msg.channel.send(new bot.RichEmbed().setColor(color).setAuthor('Ta komenda/grupa komend nie istnieje.'));
                    return;
                }
            }
            if(!cmd.subcommandGroup) {
                let emb = new bot.RichEmbed().setColor(color).setAuthor("Komenda: " + path.join(' '))
                .setDescription(`**Opis:** ${cmd.description}\n\n**Używanie:** ${cmd.usage?.replace(/\$p/g, msg.prefix) || ''}`);
                cmd.aliases && emb.setDescription(emb.description + "\n\n**Aliasy:** " + `\`${cmd.aliases.join(", ")}\``);
                cmd.permissions && emb.setDescription(emb.description + `\n\n**Uprawnienia:** \`${cmd.permissions.join(', ')}\``);
                let flagi = [cmd.notdm && "__Nie można używac na PRIV__", cmd.ownerOnly && "__Dozwolone tylko dla ownera bota__"].filter(Boolean);
                flagi.length > 0 && emb.setDescription(emb.description + "\n\n" + flagi.join("\n"));
                cmd.deprecated && emb.setDescription('**Ta komenda została wyłączona**\n\n' + `~~${emb.description}~~`);
                msg.channel.send(emb);
            }
            else
                msg.channel.send(listCmds(cmd, path.join(' '), [...new Set(cmd.subcommands.array())]));
        }
        else if(!args[1]) {
            let emb = new bot.RichEmbed().setAuthor("Moduły Komend:").setColor(color);
            for(let group in groups) {
                let l = groups[group].length;
                if(!l) continue;
                emb.addField(`**${group}**`, `${l} komend${l == 1 ? 'a' : l > 9 && l < 22 ? '' : l % 10 < 2 ? '' : l % 10 < 5 ? 'y' : ''}`, true);
            }
            emb.setDescription(`Aby zobaczyć jakie komendy zawiera moduł wpisz \`${msg.prefix}help {nazwa modułu}\`\n\u200b`);
            msg.channel.send(emb);
        }
        else
            msg.channel.send(new bot.RichEmbed().setColor(color).setAuthor('Ta komenda/grupa komend nie istnieje.'));
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