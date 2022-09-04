import { group, aliases, notdm, permissions, register, options } from "../../util/commands/CommandDecorators.js";
import Utils from '../../util/utils.js';
import { APIApplicationCommandNumberOption, ApplicationCommandOptionType, Collection, Message, Snowflake, TextChannel, User } from "discord.js";
import Context from "../../util/commands/Context.js";
import SafeEmbed from "../../util/embed/SafeEmbed.js";
import { CommandGroup } from "../../util/commands/ICommand.js";

@notdm
@group(CommandGroup.Administrative)
export default class {
    @permissions("ManageGuild")
    @register("Shows or changes the guild's prefix")
    @options({ type: ApplicationCommandOptionType.String, name: "prefix", description: "new prefix (omiting this argument will show the current prefix)" })
    static async prefix(ctx: Context) {
        let p = ctx.options.get('prefix') as string;
        if(p) {
            if(p.length <= 10) {
                ctx.bot.db.save(`Data.${ctx.guild?.id}.prefix`, p);
                await ctx.reply({ embeds: [SafeEmbed.quick(`Changed this guild's prefix to ${p}`)] });
            }
            else await ctx.reply({ embeds: [SafeEmbed.quick(`The prefix can be at max 10 characters long`)] });
        }
        else await ctx.reply({ embeds: [SafeEmbed.quick(`This guild's current prefix is ${ctx.prefix}`)] });
    }

    @aliases('yeet', 'purge', 'yeetus')
    @permissions("ManageMessages")
    @register('Finds and deletes matching messages', '', { splitter: '|' })
    @options({ type: ApplicationCommandOptionType.Integer, min_value: 1, max_value: 1500, name: 'amount', description: 'the amount of messages to delete', required: true },
             { type: ApplicationCommandOptionType.User, name: 'from', description: 'the user whose messages should be deleted' },
             { type: ApplicationCommandOptionType.String, name: 'content', description: 'delete only messages which include these words (regex literal welcome)'})
    static async delete(ctx: Context) {
        const color = 0x93c0ff;
        const amount = ctx.options.get('amount') as number;
        const from = ctx.options.get('from') as User;
        const content = ctx.options.get('content') as string;
        const match = /^\/(.*)\/([igsmu]{0,5})$/.exec(content);
        const regex = match && new RegExp(match[1], match[2] ?? '');
        const reply = await ctx.reply({ fetchReply: true, embeds: [SafeEmbed.quick("Scanning messages... <a:looking:582146502613401624>", { color, in: 'TITLE' })] });

        let scanned = 0;
        let found = new Collection<Snowflake, Message>();
        let lastId: Snowflake;
        while(scanned < (ctx.command.options![0] as APIApplicationCommandNumberOption).max_value! && found.size < amount) {
            let pack: Collection<string, Message> = await ctx.channel.messages.fetch({ limit: 100, before: lastId! || (ctx.isInteraction() ? reply.id : ctx.isMessage() ? ctx.msg.id : {} as never), cache: true });
            if(!pack.size) break;
            scanned += pack.size;
            lastId = pack.last()!.id;
            found = found.concat(pack.filter(msg => from ? from.id == msg.author.id : true).filter(msg => match ? regex!.test(msg.content) : content ? msg.content.includes(content) : true));
        }
        found = new Collection([...found.entries()].slice(0, amount));

        const question = SafeEmbed.quick("Results", { color }).setDescription(`Scanned ${scanned} messages and matched${found.size && found.size < amount ? ' only' : ''} **${found.size}** messages${(from || content) ? ' meeting the following criteria:' : ''}${found.size ? '\nDo you want to delete them?' : ''}`);
        from && question.addField('From:', from.toString(), true);
        content && question.addField(match ? 'Matches:' : 'Contains:', content, true);

        if(!found.size)
            await ctx.editReply({ embeds: [question] });
        else if(await Utils.confirmBox(reply, question, { for: ctx.user })) {
            await ctx.editReply({ embeds: [SafeEmbed.quick('Bulk deleting messages...', { color, in: 'TITLE' })], components: [] });
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
                await ctx.editReply({ embeds: [SafeEmbed.quick('Trying to manually delete remaining messages...', { color })] });
                tasks = [];
                for(let msg of old.values())
                    tasks.push(msg.delete());
                failed = (await Promise.allSettled(tasks)).filter(p => p.status == 'rejected').length;
            }
            
            await ctx.editReply({ embeds: [SafeEmbed.quick(!failed ? 'All messages have been successfully deleted' : `Successfully deleted ${found.size - failed} messages. Failed to delete ${failed} messages`, { color })] });
        }
        else
            await ctx.editReply({ embeds: [SafeEmbed.quick('Message deletion has been cancelled', { color })], components: [] });
    }
}