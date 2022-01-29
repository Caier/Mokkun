import { group, aliases, notdm, permissions, CmdParams as c, register } from "../../util/cmdUtils";
import Utils from '../../util/utils';
import { Message, TextChannel } from "discord.js";

@notdm
@group("Administracyjne")
export default class {
    @aliases('prefix')
    @permissions("MANAGE_GUILD")
    @register('Zmienia prefix komend dla serwera', '`$psetprefix {nowy prefix}`')
    static setprefix(msg: c.m, args: c.a, bot: c.b) {
        if(!args[1]) {
            Utils.send(msg.channel, bot.emb(`Obecny prefix: \`${bot.db.Data?.[msg.guild.id]?.prefix || '.'}\``));
            return;
        }
        if(args[1].length > 10) {
            Utils.send(msg.channel, bot.embgen(bot.sysColor, `Zbyt długi prefix (max. 10)`));
            return;
        }
        bot.db.save(`Data.${msg.guild.id}.prefix`, args[1]);
        Utils.send(msg.channel, bot.embgen(bot.sysColor, `Zmieniono prefix na ${args[1]}`));
    }

    @aliases("unlock")
    @permissions("MANAGE_GUILD")
    @register('blokuje / odblokowuje komendy na kanale / serwerze', `\`$plock {komenda lub zbiór komend w postaci [komenda1, komenda2, ...]}\` - blokuje lub odblokowuje komendy`)
    static lock(msg: c.m, args: any, bot: c.b) {
        args = bot.getArgs(msg.content, bot.db.Data?.[msg.guild.id]?.prefix || '.', null, null, true);
        if(!args[1]) return;
        if(typeof args[1] == 'string')
            args[1] = [args[1]];

        let out = {
            locked: [] as string[],
            unlocked: [] as string[],
            msg: ""
        };
        let guildLock = args[2] == "guild";
        let curLocks = bot.db.get(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`) || [];

        for(let cmd of args[1]) {
            if(curLocks.includes(cmd)) {
                curLocks = curLocks.filter((c: any) => !bot.commands.get(cmd).aliases.includes(c));
                out.unlocked.push(bot.commands.get(cmd).name);
            }
            else if(bot.commands.has(cmd) && cmd != this.name) {
                curLocks.push(...bot.commands.get(cmd).aliases);
                out.locked.push(bot.commands.get(cmd).name);
            }
        }
        
        if(curLocks.length == 0) curLocks = undefined;
        bot.db.save(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`, curLocks);

        if(out.locked.length != 0) 
            out.msg += `Zablokowano komendę/y \`${out.locked.join(', ')}\` na tym ${guildLock ? 'serwerze' : 'kanale'}\n`;
        if(out.unlocked.length != 0)
            out.msg += `Odblokowano komendę/y \`${out.unlocked.join(', ')}\` na tym ${guildLock ? 'serwerze' : 'kanale'}\n`;
        if(out.msg.length != 0) Utils.send(msg.channel, bot.embgen(bot.sysColor, out.msg));
    }

    @permissions("MANAGE_GUILD")
    @register('odblokowuje wszystkie komendy na kanale / serwerze', '`$punlockAll ("guild")` - odblokowuje wszystkie komendy na kanale lub serwerze (przy dodanej fladze "guild")')
    static unlockAll(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, bot.db.Data?.[msg.guild.id]?.prefix, null, null, true);
        if(args[0] == 'unlockAll') {
            let guildLock = args[1] == "guild";
            bot.db.save(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`, undefined);
            Utils.send(msg.channel, bot.embgen(bot.sysColor, `Odblokowano wszystkie komendy na tym ${guildLock ? 'serwerze' : 'kanale'}`));
            return;
        }
    }

    @aliases('delete', 'purge', 'yeetus')
    @permissions("MANAGE_MESSAGES")
    @register('b e z p i e c z n i e  usuwa wiadomości', '`$pyeet {liczba wiadomości do skasowania} (opcjonalnie){czyje wiadomości}`')
    static async yeet(msg: c.m, args: c.a, bot: c.b) {
        let glassji;
        const color = '#93c0ff';
        try {
            glassji = bot.guilds.resolve('427235931796537374').emojis.cache.find(e => e.name == 'looking');
        }
        catch(e) {
            console.log("ERR: yeet.js, nie można połączyć się z serwerem technicznym");
            glassji = "tech_serv_err";
        }
        let max = (msg.member.permissions.has('MANAGE_MESSAGES')) ? 100 : 20;

        if(!/^[0-9]+$/.test(args[1])) return;
       
        if(parseInt(args[1]) > max) {
            Utils.send(msg.channel, bot.embgen(color, `Możesz maksymalnie usunąć ${max} wiadomości`));
            return;
        }
        
        let smsg: Message;
        await Utils.send(msg.channel, bot.embgen(color, `Wyszukiwanie wiadomości... ${glassji}`)).then(nmsgg => smsg = nmsgg);
        let msgss = await Utils.fetchMsgs(msg, parseInt(args[1]), (msg.mentions.members.first()) ? msg.mentions.members.first().id : undefined, msg.id);
        smsg.delete();

        if(msgss.size == 0) {
            let nmsg: Message;
            Utils.send(msg.channel, bot.embgen(color, "Nie znaleziono żadnych wiadomości!")).then(nmsgg => nmsg = nmsgg);
            await setTimeout(() => {nmsg.delete(); msg.delete();}, 4000);
            return;
        }

        Utils.send(msg.channel, bot.embgen(color, `Czy chcesz usunąć **${msgss.size}** wiadomości${(msg.mentions.members.first() != undefined) ? ` od użytkownika **${msg.mentions.members.first().user.tag}**` : ``}?\nZareaguj aby potwierdzić`)).then(async msgg => 
        {
            let eventL: any;
            setTimeout(() => bot.removeListener("messageReactionAdd", eventL), 600000);
            await msgg.react('👍');
            await msgg.react('👎');

            bot.on("messageReactionAdd", eventL = async (rect: { message: { id: string; }; emoji: { toString: () => string; }; }, user: { id: string; }) => 
            {
                if(user.id != msg.author.id || rect.message.id != msgg.id) return;
                
                if(rect.emoji.toString() == '👍')
                {
                    msg.delete();
                    msgg.delete();
                    (msg.channel as TextChannel).bulkDelete(msgss).catch(async () => {
                        let nmsg: Message;
                        await Utils.send(msg.channel, bot.embgen(color,"Wiadomości starsze niż 2 tygodnie lub więcej niż 100...\nUsuwanie pojedyncze...\n\nPodczas procesu bot może nieobsługiwać nowych prośb o usunięcie wiadomości!\n\nPo zakończeniu ta wiadomość powinna zostać usunięta...")).then(nmsgg => nmsg = nmsgg);
                        let jobs: Promise<any>[] = [];
                        msgss.forEach(msg => jobs.push(msg.delete()));
                        await Promise.all(jobs);
                        nmsg.delete();
                    });
                }
                else 
                {
                    await msgg.edit({ embeds: [bot.embgen(color, "Wiadomości nie zostaną usunięte")] });
                    setTimeout(() => {msg.delete(); msgg.delete();}, 4000);
                }

                bot.removeListener("messageReactionAdd", eventL);
            });
        });
    }
}