import { register, CmdParams as c, group, extend, permissions, deprecated, options, autocomplete } from '../../util/commands/CommandDecorators.js';
import Utils from '../../util/utils.js';
import Context from '../../util/commands/Context.js';
import ProviderResolver from '../../util/transit/ProviderResolver.js';
import { CommandGroup } from '../../util/commands/ICommand.js';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import SafeEmbed from '../../util/embed/SafeEmbed.js';

@group(CommandGroup.Transit)
export default class {
    @register('szacowane czasy odjazdy dla danego przystanku', '', { free: 0, splitter: '|' })
    @options({ type: ApplicationCommandOptionType.String, name: 'przewoźnik', description: 'szukaj wśród przystanków tego przewoźnika', choices: [...ProviderResolver.providers.keys()].map(p => ({ name: p, value: p })), required: true },
             { type: ApplicationCommandOptionType.String, name: 'przystanek', description: 'ID przystanku', required: true, autocomplete: true })
    @autocomplete(async int => {
        const provider = ProviderResolver.providers.get(int.options.getString('przewoźnik')!);
        if(!provider)
            return [];
        return (await provider.queryStations(int.options.getString('przystanek') ?? '')).slice(0, 25).map(s => ({ name: `${s.stopName}${s.stopCode ? ' ' + s.stopCode : ''}`, value: ''+s.stopId }));
    })
    static async ztm(ctx: Context) {
        await ctx.deferReply();
        const provider = ProviderResolver.providers.get(ctx.options.get('przewoźnik'));
        const stop = provider?.stops.find(s => s.stopId == ctx.options.get('przystanek'));
        if(!provider || !stop) {
            await ctx.followUp({ embeds: [SafeEmbed.quick('Nieprawidłowy przewoźnik lub przystanek')] });
            return;
        }
        const embed = async () => provider.departuresToEmbed(await provider.getDepartures(stop));
        const msg = await ctx.followUp({ embeds: [await embed()], fetchReply: true, components: [new ActionRowBuilder<ButtonBuilder>().addComponents([new ButtonBuilder().setCustomId('o').setEmoji('🔄').setStyle(ButtonStyle.Secondary)])] });
        let coll = msg.createMessageComponentCollector({ idle: Utils.parseTimeStrToMilis('2h') });
        coll.on('collect', async int => {
            setTimeout(() => int.deferUpdate().catch(() => {}), 2700);
            await msg.edit({ embeds: [await embed()] });
            int.deferUpdate().catch(() => {});
        }).on('end', () => {
            msg.edit({ components: [] }).catch(()=>{});
        }).on('error', err => ctx.handleError(err));
    }

    @permissions('ManageChannels')
    @register('subskrybuje sytuację komunikacyjną ZTM', '')
    static async ztmsub(ctx: Context) {
        let sub = (ctx.channel.type == ChannelType.DM) ? ctx.user.id : ctx.channel.id;
        let type = (ctx.channel.type == ChannelType.DM) ? "users" : "channels";
        if((ctx.bot.db.get(`System.newsSubs.${type}`) || []).includes(sub)) {
            ctx.bot.db.save(`System.newsSubs.${type}`, ctx.bot.db.System.newsSubs[type].filter((x: string) => x != sub));
            await ctx.reply({ embeds: [SafeEmbed.quick("Ten kanał został usunięty z listy subskrybentów", { color: 13632027 })] });
        } else {
            ctx.bot.db.save(`System.newsSubs.${type}`, (ctx.bot.db.get(`System.newsSubs.${type}`) || []).concat(sub));
            await ctx.reply({ embeds: [SafeEmbed.quick("Ten kanał został dodany do listy subskrybentów sytuacji komunikacyjnej ZTM", { color: 13632027 })] });
        }
    }
}