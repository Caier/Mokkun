import { group, aliases, register, CmdParams as c, extend } from "../../util/cmdUtils";
import ax from 'axios';
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import Utils from "../../util/utils";

@group('Anime')
@extend(H.modify)
export default class H {
    static modify(msg: c.m, args: c.a, bot: c.b) {
        return [msg, bot.newArgs(msg, {freeargs: 1}), bot];
    }

    static charColor = 0xa3cb48;

    @aliases('char')
    @register('wyszukuje szczegółowy opis danej postaci z anime', '`$pcharacter {nazwa postaci (min. 3 znaki)}`')
    static async character(msg: c.m, args: c.a, bot: c.b) {
        if(!args[1] || args[1].length < 3) {
            bot.sendHelp(msg, 'char');
            return;
        }

        let charID = (await ax.get(`https://api.jikan.moe/v3/search/character?q=${encodeURI(args[1])}&limit=1`, {responseType: 'json', validateStatus: s => s == 200 || s == 404})).data?.results?.[0]?.mal_id;
        if(!charID) {
            Utils.send(msg.channel, new SafeEmbed().setColor(H.charColor).setDescription(`**${msg.author.tag}** nie znaleziono!`));
            return;
        }
        let charInfo = (await ax.get('https://api.jikan.moe/v3/character/' + charID, {responseType: 'json'})).data;

        let charEmbed = new SafeEmbed().setColor(H.charColor).setAuthor(charInfo.name + ((charInfo.name_kanji) ? ` (${charInfo.name_kanji})` : ''), undefined, charInfo.url)
        .setDescription(charInfo.about.replace(/\\n/g, '').trim()).setThumbnail(charInfo.image_url).setFooter('MAL ID: ' + charID);
        charInfo.nicknames.length > 0 && charEmbed.addField('Nicknames', charInfo.nicknames.join(', '));
        charInfo.animeography.length > 0 && charEmbed.addField('Animes', charInfo.animeography.map((a: any) => `[${a.name}](${a.url})`).join(', '));
        charInfo.mangaography.length > 0 && charEmbed.addField('Mangas', charInfo.mangaography.map((a: any) => `[${a.name}](${a.url})`).join(', '));
        charInfo.voice_actors.length > 0 && charEmbed.addField('Voice Actors', charInfo.voice_actors.map((a: any) => `[${a.name.replace(/,/g, '')}](${a.url})`).join(', '));
        
        Utils.send(msg.channel, charEmbed);
    }
}