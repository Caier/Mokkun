import { aliases, register, CmdParams as c, group, deprecated, permissions, options } from "../../util/commands/cmdUtils";
import ax from 'axios';
import fs from 'fs';
import path from 'path';
import files from "../../util/misc/files";
import { ICommand } from "../../util/commands/ICommand";
import Utils from "../../util/utils";
import Context from "../../util/commands/Context";
import { SafeEmbed } from "../../util/embed/SafeEmbed";

@group('Różne')
export default class {
    @aliases('p')
    @register('the bot\'s ping to the gateway', '')
    static async ping(ctx: Context) {
        await ctx.reply({ embeds: [new SafeEmbed().setColor("#1ece00").setDescription((Math.floor(Math.random()*500) == 232) ? `nou` : `**${ctx.user.tag}** :ping_pong: ${ctx.bot.ws.ping}ms`)] });
    }

    @register('creates a pretty hyperlink', '', { free: 2 })
    @options({ type: 'STRING', name: 'url', description: 'the url of the link', required: true },
             { type: 'STRING', name: 'title', description: 'the title od the link', required: true })
    static async link(ctx: Context) {
        await ctx.reply({ embeds: [new SafeEmbed().setColor(Utils.rand(0, 0xFFFFFF)).setTitle(ctx.args[1]).setURL(ctx.args[0])] });
    }

    @deprecated
    @register('skraca linki za pomocą bitly.com', '`$pshorten {link do skrócenia}`')
    static async shorten(msg: c.m, args: c.a, bot: c.b) {
        if(!args[1]) return;
        let color = 0xfade00;
        let resp = await ax.post("https://bitly.com/data/shorten", `url=${encodeURI(args[1])}`, {headers: {cookie: '_xsrf=0;', 'x-xsrftoken': 0}, responseType: 'json'});
        let body = resp.data, res = resp.status;
        if(res != 200) {Utils.send(msg.channel, bot.embgen(color, `Status code: ${res}`)); return}
        if(body.status_code == 200)
            Utils.send(msg.channel, new bot.RichEmbed().setColor(color).setTitle(body.data.anon_shorten.link).setDescription(args[1]));
        else 
            Utils.send(msg.channel, bot.embgen(color, `ERR: ${body.status_txt}`));
    }

    @aliases('h', '?')
    @register('pomoc', '`$phelp {nazwa komendy}`')
    static help(msg: c.m, args: c.a, bot: c.b) {
        let prefix = bot.db.Data?.[msg?.guild?.id]?.prefix || '.';
        const color = '#ffafee';
        const listCmds = (c?: ICommand, path?: string, cmds?: ICommand[], mName?: string) => new bot.RichEmbed().setColor(color)
            .setAuthor(mName ? 'Moduł: ' + mName : c.subcommandGroup ? 'Grupa Komend: ' + path : 'Komenda: ' + path)
            .setDescription(`Aby dowiedzieć się więcej o danej komendzie wpisz \`${prefix}help {nazwa komendy}\`\n\n` + (c?.subcommandGroup && c.aliases.length > 1 ? `**Aliasy:** \`${c.aliases.join(', ')}\`\n\n` : '')
            + cmds.map(c => c.name != '_' ? (c.deprecated ? '~~' : '') + `\`${prefix}${path ? path + ' ' : ''}${c.name}\` - ${c.description}` + (c.subcommandGroup ? ' `[Grupa Komend]`' : '') + (c.deprecated ? '~~  `wyłączona`' : '') 
                                          : (c.deprecated ? '~~' : '') + `\n**Domyślnie:** \`${prefix}${path ? path : ''}\` - ${c.description}; *więcej info: \`${prefix}help ${path ? path + ' ' : ''}_\`*`+ (c.deprecated ? '~~  `wyłączona`' : '')).join('\n'));

        let groups: {[prop: string]: ICommand[]} = { Inne: [] };
        for(let cmd of [...bot.commands.values()]) {
            if(cmd.group) {
                if(!groups[cmd.group]) groups[cmd.group] = [];
                !groups[cmd.group].find(c => c.name == cmd.name) && groups[cmd.group].push(cmd);
            } else
                !groups.Inne.find(c => c.name == cmd.name) && groups.Inne.push(cmd);
        }

        if(args[1] && Object.keys(groups).map(k => k.toLowerCase()).includes(args[1].toLowerCase())) {
            let module = Object.entries(groups).find(e => e[0].toLowerCase() == args[1].toLowerCase()) as [string, ICommand[]];
            Utils.send(msg.channel, listCmds(undefined, undefined, module[1], module[0]));
        }
        else if(args[1] && bot.commands.has(args[1])) {
            let cmd: ICommand, scope = bot.commands, path: string[] = [];
            for(let deep of args.slice(1)) {
                if(scope.has(deep)) {
                    cmd = scope.get(deep);
                    if(cmd.name != '_')
                        path.push(cmd.name);
                    cmd.subcommandGroup && (scope = cmd.subcommands);
                }
                else {
                    Utils.send(msg.channel, new bot.RichEmbed().setColor(color).setAuthor('Ta komenda/grupa komend/moduł nie istnieje.'));
                    return;
                }
            }
            if(!cmd.subcommandGroup) {
                let emb = new bot.RichEmbed().setColor(color).setAuthor("Komenda: " + path.join(' '))
                .setDescription(`**Opis:** ${cmd.description}\n\n**Używanie:** ${cmd.usage?.replace(/\$p/g, prefix).replace(/\$c/g, prefix + path.join(' ')) || ''}`);
                cmd.aliases && emb.setDescription(emb.description + "\n\n**Aliasy:** " + `\`${cmd.aliases.map(a => `${path.slice(0, -1)} ${a}`).join(", ")}\``);
                cmd.permissions && emb.setDescription(emb.description + `\n\n**Uprawnienia:** \`${cmd.permissions.join(', ')}\``);
                let flagi = [cmd.notdm && "__Nie można używac na PRIV__", cmd.ownerOnly && "__Dozwolone tylko dla ownera bota__"].filter(Boolean);
                flagi.length > 0 && emb.setDescription(emb.description + "\n\n" + flagi.join("\n"));
                cmd.deprecated && emb.setDescription('**Ta komenda została wyłączona**\n\n' + `~~${emb.description}~~`);
                Utils.send(msg.channel, emb);
            }
            else
                Utils.send(msg.channel, listCmds(cmd, path.join(' '), [...new Set([...cmd.subcommands.values()])]));
        }
        else if(!args[1]) {
            let emb = new bot.RichEmbed().setAuthor("Moduły Komend:").setColor(color);
            for(let group in groups) {
                let l = groups[group].length;
                if(!l) continue;
                emb.addField(`**${group}**`, `${l} komend${l == 1 ? 'a' : l > 9 && l < 22 ? '' : l % 10 < 2 ? '' : l % 10 < 5 ? 'y' : ''}`, true);
            }
            emb.setDescription(`Aby zobaczyć jakie komendy zawiera moduł wpisz \`${prefix}help {nazwa modułu}\`\n\u200b`);
            Utils.send(msg.channel, emb);
        }
        else
            Utils.send(msg.channel, new bot.RichEmbed().setColor(color).setAuthor('Ta komenda/grupa komend nie istnieje.'));
    }
}