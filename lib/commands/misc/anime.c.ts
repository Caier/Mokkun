import { group, aliases, register, CmdParams as c, extend, options } from "../../util/commands/cmdUtils";
import ax from 'axios';
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import Utils from "../../util/utils";
import Context from "../../util/commands/Context";

@group('Anime')
export default class {
    @aliases('char')
    @register('gets a detailed description of an anime character', '', { free: 0 })
    @options({ type: "STRING", name: 'character', description: 'the character to lookup (min. 3 letters)', required: true })
    static async character(ctx: Context) {
        const color = 0xa3cb48;
        const query = ctx.options.get('character') as string;
        if(query?.length < 3) {
            await ctx.reply({ embeds: [ctx.emb('The query must be at least 3 characters long.', { color })] });
            return;
        }

        const reply = await ctx.reply({ embeds: [ctx.emb('Searching for characters...', { color })], fetchReply: true });
        const chars = (await ax.get(`https://api.jikan.moe/v4/characters?q=${encodeURI(query)}&limit=25&order_by=favorites&sort=desc`, {responseType: 'json', validateStatus: s => s == 200 || s == 404})).data?.data;
        if(!chars?.length) {
            await ctx.editReply({ embeds: [ctx.emb(`**${ctx.user} couldn't find:** ${query}`, { color, in: 'DESC' })] });
            return;
        }

        let embedPromises = chars.map((c: any) => async () => {
            let charInfo: any;
            const tryGetInfo = async (rets = 0) => {
                try {
                    charInfo = (await ax.get('https://api.jikan.moe/v4/characters/' + c.mal_id, { responseType: 'json' })).data.data;
                } catch(err: any) {
                    if(err.response.status == 500 && rets < 5)
                        await tryGetInfo(rets + 1);
                    else
                        throw err;
                }
            }
            await tryGetInfo();
            const charEmbed = new SafeEmbed().setColor(color).setAuthor(charInfo?.name ?? '', undefined, charInfo?.url ?? '')
            .setDescription(charInfo.about?.replace(/\\n/g, '').trim() ?? '').setThumbnail(charInfo.images?.jpg?.image_url ?? '').setFooter('MAL ID: ' + c.mal_id);
            charInfo?.nicknames?.length > 0 && charEmbed.addField('Nicknames', charInfo.nicknames.join(', '));
            charInfo?.animeography?.length > 0 && charEmbed.addField('Animes', charInfo.animeography.map((a: any) => `[${a.name}](${a.url})`).join(', '));
            charInfo?.mangaography?.length > 0 && charEmbed.addField('Mangas', charInfo.mangaography.map((a: any) => `[${a.name}](${a.url})`).join(', '));
            charInfo?.voice_actors?.length > 0 && charEmbed.addField('Voice Actors', charInfo.voice_actors.map((a: any) => `[${a.name.replace(/,/g, '')}](${a.url})`).join(', '));
            return charEmbed;
        });
        
        await Utils.createPageSelector(reply, embedPromises);
    }
}