import { register, CmdParams as c, group, extend, permissions, deprecated, options, autocomplete } from '../../util/commands/cmdUtils';
import { MessageActionRow, MessageButton } from 'discord.js';
import Utils from '../../util/utils';
import Context from '../../util/commands/Context';
import ProviderResolver from '../../util/transit/ProviderResolver';

@group('Komunikacyjne')
export default class {
    @register('szacowane czasy odjazdy dla danego przystanku', '', { free: 0, splitter: '|' })
    @options({ type: 'STRING', name: 'przewoźnik', description: 'szukaj wśród przystanków tego przewoźnika', choices: [...ProviderResolver.providers.keys()].map(p => ({ name: p, value: p })), required: true },
             { type: 'STRING', name: 'przystanek', description: 'ID przystanku', required: true, autocomplete: true })
    @autocomplete(async int => {
        const provider = ProviderResolver.providers.get(int.options.getString('przewoźnik'));
        if(!provider)
            return [];
        return (await provider.queryStations(int.options.getString('przystanek') ?? '')).slice(0, 25).map(s => ({ name: `${s.stopName}${s.stopCode ? ' ' + s.stopCode : ''}`, value: ''+s.stopId }));
    })
    static async ztm(ctx: Context) {
        await ctx.deferReply();
        const provider = ProviderResolver.providers.get(ctx.options.get('przewoźnik'));
        const embed = async () => provider.departuresToEmbed(await provider.getDepartures(provider.stops.find(s => s.stopId == ctx.options.get('przystanek'))));
        const msg = await ctx.followUp({ embeds: [await embed()], fetchReply: true, components: [new MessageActionRow().addComponents([new MessageButton().setCustomId('o').setEmoji('🔄').setStyle('SECONDARY')])] });
        let coll = msg.createMessageComponentCollector({ idle: Utils.parseTimeStrToMilis('2h') });
        coll.on('collect', async int => {
            setTimeout(() => int.deferUpdate().catch(() => {}), 2700);
            await msg.edit({ embeds: [await embed()] });
            int.deferUpdate().catch(() => {});
        }).on('end', () => {
            msg.edit({ components: [] }).catch(()=>{});
        }).on('error', err => ctx.handleError(err));
    }

    @permissions('MANAGE_CHANNELS')
    @register('subskrybuje sytuację komunikacyjną ZTM', '')
    static async ztmsub(ctx: Context) {
        let sub = (ctx.channel.type == 'DM') ? ctx.user.id : ctx.channel.id;
        let type = (ctx.channel.type == 'DM') ? "users" : "channels";
        if((ctx.bot.db.get(`System.newsSubs.${type}`) || []).includes(sub)) {
            ctx.bot.db.save(`System.newsSubs.${type}`, ctx.bot.db.System.newsSubs[type].filter((x: string) => x != sub));
            await ctx.reply({ embeds: [ctx.emb("Ten kanał został usunięty z listy subskrybentów", { color: 13632027 })] });
        } else {
            ctx.bot.db.save(`System.newsSubs.${type}`, (ctx.bot.db.get(`System.newsSubs.${type}`) || []).concat(sub));
            await ctx.reply({ embeds: [ctx.emb("Ten kanał został dodany do listy subskrybentów sytuacji komunikacyjnej ZTM", { color: 13632027 })] });
        }
    }
}