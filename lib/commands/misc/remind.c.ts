import { group, aliases, register, CmdParams as c, subcommandGroup, extend } from "../../util/cmdUtils";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { LoggedError } from "../../util/errors/errors";
import { IRemind } from "../../util/interfaces/IRemind";
import Utils from "../../util/utils";

const remCol = '#00ffff';

@group("Różne")
export default class H {};

@subcommandGroup('komendy związane z przypomnieniami', H)
@aliases('r')
@extend((m: c.m, a: c.a, b: c.b) => [m, a, b, b.db.System?.reminders || []])
class remind {
    @aliases('a')
    @register('tworzy przypomnienie na bieżącym kanale', '`$c {za ile? przykład: 1M30d24h60m} {treść przypomnienia}`')
    static add(msg: c.m, args: c.a, bot: c.b, reminds: IRemind[]) {
        args = bot.newArgs(msg, {freeargs: 3}).slice(1);
        if(!args[1] || !args[2]) {
            bot.sendHelp(msg, ['remind', 'add']);
            return;
        }

        if(reminds.filter(r => msg.guild?.channels?.resolve(r.createdIn) || bot.channels?.resolve(r.createdIn)).length > 50)
            throw new LoggedError(msg.channel, "Przekroczono limit przypomnień dla tego " + (msg.guild ? 'serwera' : 'użytkownika'));

        let boomTime = Utils.parseTimeStrToMilis(args[1]);
        if(boomTime < 1)
            throw new LoggedError(msg.channel, 'Niepoprawny czas przypomnienia');
        boomTime += Date.now();

        let id = ((+('' + Date.now()).slice(7)).toString(36) + Math.random().toString(36).substr(2, 3));
        reminds.push({
            id,
            author: msg.author.id,
            authorLit: msg.author.tag,
            createdAt: Date.now(),
            createdIn: msg.channel.id,
            content: args[2],
            boomTime
        });
        bot.db.save('System.reminders', reminds);

        msg.channel.send(new SafeEmbed().setColor(remCol).setAuthor('Ustawiono przypomnienie').setDescription(args[2])
                            .addField('Kiedy', Utils.genDateString(new Date(boomTime), '%D.%M.%Y %h:%m'), true)
                            .addField('Od', msg.author, true).setFooter('id: ' + id)
        ).then(async nmsg => {
            await nmsg.react('❌');
            nmsg.createReactionCollector((r, u) => r.emoji.name == '❌' && u.id == msg.author.id, {time: Utils.parseTimeStrToMilis('2m')})
                .on('collect', () => {
                    bot.db.save('System.reminders', ((bot.db.System.reminders || []) as IRemind[]).filter(r => r.id != id));
                    nmsg.delete();
                    msg.channel.send(new SafeEmbed().setColor(remCol).setAuthor('Anulowano przypomnienie'));
                })
                .on('end', () => nmsg.reactions.removeAll().catch(e => {}));
        });
    }

    @aliases('l')
    @register('wyświetla wszystkie przypomnienia utworzone na bieżącym kanale', '`$c`')
    static list(msg: c.m, args: c.a, bot: c.b, reminds: IRemind[]) {
        reminds = reminds.filter(r => msg.guild && msg.guild.channels.cache.keyArray().includes(r.createdIn) || msg.channel.id == r.createdIn);
        if(!reminds.length) 
            throw new LoggedError(msg.channel, 'Brak przypomnień', remCol);
            
        let emb = new SafeEmbed().setColor(remCol).setAuthor('Lista przypomnień').addFields(
            reminds.map(r => ({name: r.content, value: `**Od:** <@${r.author}>\n**Kiedy:** \`${Utils.genDateString(new Date(r.boomTime), '%D.%M.%Y %h:%m')}\`${msg.guild ? `\n**Na:** <#${r.createdIn}>` : ''}\n**id:** \`${r.id}\``, inline: true})));
        if(emb.fields.length > 9)
            Utils.createPageSelector(msg.channel as any, emb.populateEmbeds(9), {triggers: [msg.author.id]});
        else
            msg.channel.send(emb);
    }

    @aliases('r', 'rem')
    @register('usuwa ustawione przypomnienia po id', '`$c {id przypomnienia}`')
    static remove(msg: c.m, args: c.a, bot: c.b, reminds: IRemind[]) {
        if(!args[1]) {
            bot.sendHelp(msg, ['remind', 'remove']);
            return;
        }

        let r = reminds.find(r => r.id == args[1]);
        if(!r)
            throw new LoggedError(msg.channel, "Takie przypomnienie nie istnieje", remCol);
        if(r.author == msg.author.id && (msg.guild?.channels.cache.keyArray().includes(r.createdIn) || r.createdIn == msg.channel.id)) {
            bot.db.save('System.reminders', bot.db.System.reminders.filter((r: IRemind) => r.id != args[1]));
            msg.channel.send(bot.emb('Usunięto przypomnienie', remCol, true));
        }
        else
            throw new LoggedError(msg.channel, "Możesz usunąć jedynie swoje przypomnienia" + msg.channel.type != 'dm' ?  " z bieżącego serwera" : '', remCol)
    }
}