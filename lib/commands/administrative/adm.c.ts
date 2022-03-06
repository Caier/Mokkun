import { group, aliases, notdm, permissions, CmdParams as c, register, deprecated, options } from "../../util/commands/cmdUtils";
import Utils from '../../util/utils';
import { Collection, Message, Snowflake, TextChannel, User } from "discord.js";
import Context from "../../util/commands/Context";

@notdm
@group("Administracyjne")
export default class {
    @permissions("MANAGE_GUILD")
    @register("Shows or changes the guild's prefix")
    @options({ type: "STRING", name: "prefix", description: "new prefix (omiting this argument will show the current prefix)" })
    static async prefix(ctx: Context) {
        let p = ctx.options.get('prefix') as string;
        if(p) {
            if(p.length <= 10) {
                ctx.bot.db.save(`Data.${ctx.guild.id}.prefix`, p);
                await ctx.reply({ embeds: [ctx.emb(`Changed this guild's prefix to ${p}`)] });
            }
            else await ctx.reply({ embeds: [ctx.emb(`The prefix can be at max 10 characters long`)] });
        }
        else await ctx.reply({ embeds: [ctx.emb(`This guild's current prefix is ${ctx.prefix}`)] });
    }

    @deprecated
    @aliases("unlock")
    @permissions("MANAGE_GUILD")
    @register('blokuje / odblokowuje komendy na kanale / serwerze', `\`$plock {komenda lub zbiór komend w postaci [komenda1, komenda2, ...]}\` - blokuje lub odblokowuje komendy`)
    static lock(msg: c.m, args: any, bot: c.b) {
        args = bot.getArgs(msg.content, bot.db.Data?.[msg.guild.id]?.prefix || '.', null, null);
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

    @deprecated
    @permissions("MANAGE_GUILD")
    @register('odblokowuje wszystkie komendy na kanale / serwerze', '`$punlockAll ("guild")` - odblokowuje wszystkie komendy na kanale lub serwerze (przy dodanej fladze "guild")')
    static unlockAll(msg: c.m, args: c.a, bot: c.b) {
        //args = bot.getArgs(msg.content, bot.db.Data?.[msg.guild.id]?.prefix, null, null, true);
        if(args[0] == 'unlockAll') {
            let guildLock = args[1] == "guild";
            bot.db.save(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`, undefined);
            Utils.send(msg.channel, bot.embgen(bot.sysColor, `Odblokowano wszystkie komendy na tym ${guildLock ? 'serwerze' : 'kanale'}`));
            return;
        }
    }

    @aliases('yeet', 'purge', 'yeetus')
    @permissions("MANAGE_MESSAGES")
    @register('Finds and deletes matching messages', '', { splitter: '|' })
    @options({ type: "INTEGER", minValue: 1, maxValue: 1500, name: 'amount', description: 'the amount of messages to delete', required: true },
             { type: "USER", name: 'from', description: 'the user whose messages should be deleted' },
             { type: "STRING", name: 'content', description: 'delete only messages which include these words (regex literal welcome)'})
    static async delete(ctx: Context) {
        const color = 0x93c0ff;
        const amount = ctx.options.get('amount') as number;
        const from = ctx.options.get('from') as User;
        const content = ctx.options.get('content') as string;
        const match = /^\/(.*)\/([igsmu]{0,5})$/.exec(content);
        const regex = match && new RegExp(match[1], match[2] ?? '');
        const reply = await ctx.reply({ fetchReply: true, embeds: [ctx.emb("Scanning messages... <a:looking:582146502613401624>", { color, in: 'TITLE' })] });

        let scanned = 0;
        let found = new Collection<Snowflake, Message>();
        let lastId: Snowflake;
        while(scanned < (ctx.command.options[0] as any).maxValue && found.size < amount) {
            let pack = await ctx.channel.messages.fetch({ limit: 100, before: lastId || (ctx.isSlash ? reply.id : ctx.msg.id) }, { force: true, cache: true });
            if(!pack.size) break;
            scanned += pack.size;
            lastId = pack.last()?.id;
            found = found.concat(pack.filter(msg => from ? from.id == msg.author.id : true).filter(msg => match ? regex.test(msg.content) : content ? msg.content.includes(content) : true));
        }
        found = new Collection([...found.entries()].slice(0, amount));

        const question = ctx.emb("Results", { color }).setDescription(`Scanned ${scanned} messages and matched${found.size && found.size < amount ? ' only' : ''} **${found.size}** messages${(from || content) ? ' meeting the following criteria:' : ''}${found.size ? '\nDo you want to delete them?' : ''}`);
        from && question.addField('From:', from.toString(), true);
        content && question.addField(match ? 'Matches:' : 'Contains:', content, true);

        if(!found.size)
            await ctx.editReply({ embeds: [question] });
        else if(await Utils.confirmBox(reply, question, { for: ctx.user })) {
            await ctx.editReply({ embeds: [ctx.emb('Bulk deleting messages...', { color, in: 'TITLE' })], components: [] });
            let old = new Collection<Snowflake, Message>();
            let tasks = [];
            for(let i = 0; i < found.size; i += 100) {
                let toBulk = [...found.values()].slice(i, i + 100);
                if(toBulk.length > 1)
                    tasks.push((ctx.channel as TextChannel).bulkDelete(toBulk));
            }
            
            let results = (await Promise.all(tasks)).map(c => [...c.keys()]).flat();
            found.filter(msg => !results.find(m => m == msg.id)).forEach(msg => old.set(msg.id, msg));
            
            let failed = 0;
            if(old.size) {
                await ctx.editReply({ embeds: [ctx.emb('Trying to manually delete remaining messages...', { color })] });
                tasks = [];
                for(let msg of old.values())
                    tasks.push(msg.delete());
                failed = (await Promise.allSettled(tasks)).filter(p => p.status == 'rejected').length;
            }
            
            await ctx.editReply({ embeds: [ctx.emb(!failed ? 'All messages have been successfully deleted' : `Successfully deleted ${found.size - failed} messages. Failed to delete ${failed} messages`, { color })] });
        }
        else
            await ctx.editReply({ embeds: [ctx.emb('Message deletion has been cancelled', { color })], components: [] });
    }
}