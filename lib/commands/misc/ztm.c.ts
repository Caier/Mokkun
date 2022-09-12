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

        let page = 0;
        let embeds = provider.departuresToEmbed(await provider.getDepartures(stop)).populateEmbeds(5);
        let components = [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('o').setEmoji('🔄').setStyle(ButtonStyle.Success))];
        if(embeds.length > 1)
            components[0].addComponents(new ButtonBuilder().setCustomId('b').setStyle(ButtonStyle.Secondary).setEmoji('◀').setDisabled(true),
                new ButtonBuilder().setCustomId('n').setStyle(ButtonStyle.Secondary).setEmoji('▶'));

        const msg = await ctx.followUp({ embeds: [embeds[page]], fetchReply: true, components });
        let coll = msg.createMessageComponentCollector({ idle: Utils.parseTimeStrToMilis('2h') });
        coll.on('collect', async int => {
            components.forEach(c => c.components.forEach(c => c.setDisabled(true)));
            await int.update({ components });

            if(int.customId == 'o') {
                page = 0;
                embeds = provider.departuresToEmbed(await provider.getDepartures(stop)).populateEmbeds(5);
                components = [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('o').setEmoji('🔄').setStyle(ButtonStyle.Success))];
                if(embeds.length > 1)
                    components[0].addComponents(new ButtonBuilder().setCustomId('b').setStyle(ButtonStyle.Secondary).setEmoji('◀').setDisabled(true),
                        new ButtonBuilder().setCustomId('n').setStyle(ButtonStyle.Secondary).setEmoji('▶'));
                await msg.edit({ embeds: [embeds[page]], components });
            } else {
                page += int.customId == 'n' ? 1 : -1;
                components.forEach(c => c.components.forEach((c, i) => c.setDisabled(i != 0 && ((page == 0 && i == 1) || (page == embeds.length - 1 && i == 2)))));
                await msg.edit({ embeds: [embeds[page]], components });
            }
        }).on('end', () => {
            components.forEach(c => c.components.forEach(c => c.setDisabled(true)));
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