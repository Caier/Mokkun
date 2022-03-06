import { MessageActionRow, MessageButton } from "discord.js";
import { group, aliases, register, CmdParams as c, subcommandGroup, extend, options, autocomplete } from "../../util/commands/cmdUtils";
import Context from "../../util/commands/Context";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { IRemind } from "../../util/interfaces/IRemind";
import Utils from "../../util/utils";

const remCol = '#00ffff';

@group("Różne")
export default class H {};

@subcommandGroup('komendy związane z przypomnieniami', H)
@aliases('r')
@extend(ctx => [ctx, ctx.bot.db.System?.reminders || []])
class remind {
    @aliases('a')
    @register('created a reminder on the current channel', '', { free: 1 })
    @options({ type: 'STRING', name: 'time', description: 'remind me in: ex: 1M30d24h60m', required: true },
             { type: 'STRING', name: 'content', description: 'content of the reminder', required: true })
    static async add(ctx: Context, reminds: IRemind[]) {
        const content = ctx.options.get('content') as string;
        let guildChs = await ctx.guild?.channels?.fetch();
        if(reminds.filter(r => guildChs ? guildChs.has(r.createdIn) : (r.createdIn == ctx.user.dmChannel.id)).length >= 50)
            return await ctx.reply({ embeds: [ctx.emb('You cannot have more than 50 reminders per guild / dmChannel', { color: remCol })] });
        
        let boomTime = Utils.parseTimeStrToMilis(ctx.options.get('time'));
        if(boomTime < 1)
            return await ctx.reply({ embeds: [ctx.emb('Invalid time', { color: remCol })] });
        boomTime += Date.now();

        const id = ((+('' + Date.now()).slice(7)).toString(36) + Math.random().toString(36).slice(2, 5));
        reminds.push({
            id,
            author: ctx.user.id,
            authorLit: ctx.user.tag,
            createdAt: Date.now(),
            createdIn: ctx.channel.id,
            content,
            boomTime
        });
        ctx.bot.db.save('System.reminders', reminds);

        let msg = await ctx.reply({ fetchReply: true, embeds: [new SafeEmbed().setColor(remCol).setAuthor("Reminder's been set").setDescription(content)
                                                                .addField('When', `<t:${Math.floor(boomTime/1000)}>`, true)
                                                                .addField('From', ctx.user.toString(), true).setFooter('id: ' + id)],
                         components: [new MessageActionRow().setComponents([new MessageButton().setCustomId('x').setLabel('Nevermind').setStyle('DANGER')])]});
        
        msg.createMessageComponentCollector({ time: Math.min(120_000, boomTime - Date.now()), componentType: 'BUTTON', filter: int => int.user.id == ctx.user.id || int.deferUpdate() && false })
        .on('collect', () => {
            ctx.bot.db.save('System.reminders', ((ctx.bot.db.System.reminders || []) as IRemind[]).filter(r => r.id != id));
            ctx.editReply({ embeds: [ctx.emb("Reminder's been cancelled", { color: remCol })], components: [] });
        })
        .on('end', () => msg.edit({ components: [] }).catch(()=>{}) as any);
    }

    @aliases('l')
    @register('shows all reminders created on this guild/dmChannel', '')
    static async list(ctx: Context, reminds: IRemind[]) {
        let guildChs = await ctx.guild?.channels?.fetch();
        reminds = reminds.filter(r => guildChs && guildChs.has(r.createdIn) || ctx.channel.id == r.createdIn);
        if(!reminds.length)
            return await ctx.reply({ embeds: [ctx.emb('No reminders found', { color: remCol })] });
            
        let emb = new SafeEmbed().setColor(remCol).setAuthor('Reminders list').addFields(
            reminds.map(r => ({name: r.content, value: `**From:** <@${r.author}>\n**When:** <t:${Math.floor(+r.boomTime/1000)}>${ctx.guild ? `\n**In:** <#${r.createdIn}>` : ''}\n**id:** \`${r.id}\``, inline: true})));
        if(emb.fields.length > 9)
            await Utils.createPageSelector(await ctx.deferReply({ fetchReply: true }), emb.populateEmbeds(9));
        else
            await ctx.reply({ embeds: [emb] });
    }

    @aliases('r', 'rem')
    @register('removes reminders (you can remove other\'s reminders only if you have the MANAGE_MESSAGES permission', '')
    @options({ type: 'STRING', name: 'id', description: 'ids of the reminders you want to remove separated by commas', required: true, autocomplete: true })
    @autocomplete((int, bot) => {
        const idTyped = int.options.getString('id').split(',').map(i => i.trim());
        let availRems = (bot.db.System?.reminders as IRemind[])?.filter(r => int.guild?.channels.cache.get(r.createdIn) || r.createdIn == int.channel.id);
        availRems = availRems.filter(r => !idTyped.includes(r.id) && (idTyped[idTyped.length - 1]?.length ? r.id.startsWith(idTyped[idTyped.length - 1]) : true));
        if(int.guild && !(int.member.permissions as any)?.has('MANAGE_MESSAGES'))
            availRems = availRems.filter(r => r.author == int.user.id);
        let value = (r: IRemind) => idTyped.slice(0, -1).filter(i => i != '').join(',') + `${idTyped.length > 1 ? ',' : ''}${r.id}`;
        let resp = availRems.map(r => ({ name: value(r), value: value(r) }));
        return resp;
    })
    static async remove(ctx: Context, reminds: IRemind[]) {
        let parsedIds = (ctx.options.get('id') as string).split(',').map(i => i.trim()).filter(i => i != '' && i != ' ');
        let guildChs = await ctx.guild?.channels?.fetch();
        let availRems = (ctx.bot.db.System?.reminders as IRemind[])?.filter(r => guildChs.get(r.createdIn) || r.createdIn == ctx.channel.id);
        if(ctx.guild && !ctx.member.permissions.has('MANAGE_MESSAGES'))
            availRems = availRems.filter(r => r.author == ctx.user.id);
        let successIds = [];
        for(let id of parsedIds) {
            if(!availRems.find(r => r.id == id))
                continue;
            reminds = reminds.filter(r => r.id != id);
            successIds.push(id);
        }
        ctx.bot.db.save('System.reminders', reminds);
        await ctx.reply({ embeds: [ctx.emb(successIds.length ? `**Deleted reminders with ids:**\n${successIds.join(', ')}` : "Couldn't delete any reminders", { in: "DESC", color: remCol })] });
    }
}