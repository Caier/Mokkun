import { group, aliases, register, CmdParams as c, nsfw, deprecated, subcommandGroup } from "../../util/cmdUtils";
import { fromGB, fromBooru, fromNH, fromPH } from '../../util/misc/searchMethods';
import Utils from "../../util/utils";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { Message, MessageEmbed, MessageReaction, User } from "discord.js";

@nsfw
@group("NSFW")
export default class H {
    static embFromImg(x: any, s?: string) {
        let embed = new SafeEmbed();
        if(x.tags != "video") {
            embed.setFooter(`ID: ${x.id}, Score: ${x.score}, Rating: ${x.rating}, Artist: ${x.artist}, Posted: ${x.posted}\nTags: ` + x.tags).setImage(x.link).setTitle((!s || s == '') ? "random" : s)
                 .setURL(x.page).setColor("#006ffa").setAuthor("Gelbooru", "https://pbs.twimg.com/profile_images/1118350008003301381/3gG6lQMl.png", "http://gelbooru.com/");
            if(x.comments.length != 0) 
                embed.addField(`${x.comments[0].name}:`, x.comments[0].comment);
        } 
        else embed = x.link;
        return embed;
    }

    static async newPostReact(msg: Message, method: (ret: boolean) => void | Promise<(MessageEmbed | string) | (MessageEmbed | string)[]>) {
        await msg.react('🔄');
        await msg.react('🔒');
        let save = false;
        let coll = msg.createReactionCollector({ filter: (react: MessageReaction, user: User) => !user.bot && ['🔄', '🔒'].includes(react.emoji.name) });
        let r = (react: MessageReaction, user: User) => {
            save = true;
            r = () => react.users.remove(user);
        };
        coll.on('collect', async (react, user) => {
            if(react.emoji.name == '🔒')
                r(react, user);
            else if(react.emoji.name == '🔄') {
                if(msg.flags.has('SUPPRESS_EMBEDS'))
                    msg.suppressEmbeds(false);
                react.users.remove(user.id);
                if(save) {
                    coll.stop();
                    react.remove();
                    method(false);
                }
                else {
                    let res = await method(true);
                    if(Array.isArray(res))
                        Utils.createPageSelector(msg.channel as any, res as any, {toEdit: msg, emojis: [null, `◀`, `▶`]});
                    else if(typeof res != 'string') {
                        msg.edit({embeds: [res as MessageEmbed]});
                        if(typeof res == 'string')
                            msg.suppressEmbeds(true);
                    }
                }
            }
        });
    }

    @register(':peepSelfie:', '`$c {wyszukanie}` - zobacz sam')
    static async gb(msg: c.m, args: c.a, bot: c.b, ret = false) {
        args = bot.newArgs(msg, { freeargs: 1 });
        const color = "#006ffa";
        let sort = args[1].includes('sort:');

        let nmsg = !ret && await Utils.send(msg.channel, bot.emb('Zbieranie postów...', color)); 
        let imgs = await fromGB(args[1], !sort);

        if(!imgs.length) {
            nmsg?.edit({embeds: [bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`)]});
            return;
        }
        
        if(sort && !ret)
            await Utils.createPageSelector(msg.channel as any, imgs.map(i => async () => H.embFromImg(await i(), args[1])), {toEdit: nmsg});
        else {
            let x = await imgs[0]();
            let embed = H.embFromImg(x, args[1])
            if(x.comments.length > 1) {
                let emb = new SafeEmbed().setTitle("Komentarze").setColor(color);
                x.comments.forEach(com => emb.addField(`${com.score}👍  ${com.name}:`, com.comment));
                let embs = emb.populateEmbeds();
                if(ret)
                    return [embed, ...(embs.length > 0 ? embs : [emb])];
                await Utils.createPageSelector(msg.channel as any, [embed, ...(embs.length > 0 ? embs : [emb])], {toEdit: nmsg, emojis: [null, `◀`, `▶`]});
                H.newPostReact(nmsg, r => H.gb(msg, args, bot, r));
            }
            else if(ret)
                return embed;
            else {
                nmsg.edit({embeds: [embed]}).then(nmsg => H.newPostReact(nmsg, r => H.gb(msg, args, bot, r)));
                x.tags == 'video' && await nmsg.suppressEmbeds(true);
            }
        }
    }

    @register('scraper wielu .booru', '`$c {nazwa booru} {wyszukanie}')
    @aliases('b')
    static async booru(msg: c.m, args: c.a, bot: c.b, ret = false) {
        args = bot.newArgs(msg, {freeargs: 2});
        const color = "#7750ff";

        let nmsg = !ret && await Utils.send(msg.channel, bot.emb('Zbieranie postów...', color)); 
        let imgs = await fromBooru(args[1], args[2]);

        if(!imgs.length) {
            nmsg?.edit({embeds: [bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`)]});
            return;
        }

        let x = imgs[0];
        if(x.tags != "video") {
            let embed = H.embFromImg(x, args[2]);
            embed?.setColor(color)?.setAuthor(args[1] == 'furry' ? 'furry.booru' : x.base.split('//')[1].split('.').slice(0, -1).join('.'), "https://cdn.discordapp.com/attachments/752238790323732494/833855293405265950/3gG6lQMl.png", x.base);
            if(ret)
                return embed;
            nmsg.edit({embeds: [embed]}).then(mmsg => H.newPostReact(mmsg, r => H.booru(msg, args, bot, r)));
        }
        else if(ret)
            return x.link;
        else {
            nmsg.edit(x.link).then(mmsg => H.newPostReact(mmsg, r => H.booru(msg, args, bot, r)));
            await nmsg.suppressEmbeds(true);
        }
    }

    @aliases('rule34')
    @register('Rule 34 - obrazki kotków na wyciągnięcie ręki', '`$pr34 {wyszukanie}` - zobacz sam')
    static async r34(msg: c.m, args: c.a, bot: c.b, ret = false) {
        args = bot.newArgs(msg, {freeargs: 1});
        msg.content = `${bot.db.Data?.[msg?.guild?.id]?.prefix || '.'}b r34 ${args[1]}`;
        H.booru(msg, args, bot, ret);
    }

    @aliases('nhentai')
    @register('Doujiny na wyciągnięcie ręki!', '`$pnh {tagi | numerek | URL}` - wyszukuje specyficzny doujin\n`$pnh` - losowy doujin')
    static async nh(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, bot.db.Data?.[msg?.guild?.id]?.prefix || '.', "|", 1);

        let doujin = (args[1]) 
        ? (/^[0-9]+$/.test(args[1])) 
            ? await fromNH("https://nhentai.net/g/" + args[1]) 
            : (/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(args[1])) 
                ? await fromNH(args[1])
                : await fromNH(null, args[1])
        : await fromNH();
       
        if(!doujin) {
            Utils.send(msg.channel, new SafeEmbed().setColor("#f40e29").setDescription(`**${msg.author.tag}** nie znaleziono!`));
            return;
        }

        let embed = new SafeEmbed().setImage(doujin.thumb).setTitle(doujin.name).setURL(doujin.link).addField("Tagi: ", doujin.tags).setFooter(`Strony: ${doujin.maxPage}`).setColor("#f40e29").setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png");

        Utils.send(msg.channel, embed).then(async nMsg => 
            {
                let curPage = 0;
                let eventL: any;
                for (let x of ['⏮','◀','▶','⏭','2⃣','5⃣','🔟','🔀','❌'])
                    await nMsg.react(x);

                bot.on("messageReactionAdd", eventL = async (react: { emoji: { toString: () => any; }; message: { id: string; }; users: { remove: (arg0: any) => void; }; }, user: { id: string; }) =>
                {
                    let emoji = react.emoji.toString();
                    setTimeout(() => bot.removeListener("messageReactionAdd", eventL), 1800000);

                    if(react.message.id != nMsg.id || user.id != msg.author.id) return;

                    if(['⏭','2⃣','5⃣','🔟','🔀','◀','▶'].includes(emoji))
                    {
                        react.users.remove(user.id);
                        switch(emoji)
                        {
                            case '▶': curPage++; break;
                            case '◀': curPage--; break;
                            case '⏭': curPage = doujin.maxPage; break;
                            case '2⃣': curPage += 2; break;
                            case '5⃣': curPage += 5; break;
                            case '🔟': curPage += 10; break;
                            case '🔀': curPage = Math.floor(Math.random() * doujin.maxPage); break;
                        }
                        if(curPage > doujin.maxPage || curPage < 1)
                            curPage = (curPage > doujin.maxPage) ? doujin.maxPage : (curPage < 1) ? 1 : null;
                        
                        let newpageURL = `https://i.nhentai.net/galleries/${doujin.thumb.split("/").slice(4, -1).join("/")}/${curPage}.${doujin.format}`;
                        nMsg.edit({embeds: [new SafeEmbed().setTitle(doujin.name).setURL(doujin.link + curPage).setImage(newpageURL).setColor("#f40e29").setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png").setFooter(`Strona ${curPage}/${doujin.maxPage}`)]});
                    }
                    else if(emoji == '⏮')
                    {
                        react.users.remove(user.id);
                        nMsg.edit({embeds: [embed]});
                        curPage = 0;
                    }
                    else if(emoji == '❌')
                    {
                        nMsg.edit({embeds: [new SafeEmbed().setColor('#f40e29').setTitle("link").setURL(doujin.link).setDescription(`**${msg.author.tag}** zakończono czytanie!`)]});
                        nMsg.reactions.removeAll();
                        bot.removeListener("messageReactionAdd", eventL);
                    }
                });
            });
    }

    @deprecated
    @aliases('pornhub')
    @register('Wyszukiwarka PornHuba', '`$pph {wyszukanie} | (opcjonalnie){ilość wyników max. 5}` - zobacz sam')
    static async ph(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, bot.db.Data?.[msg?.guild?.id]?.prefix || '.', "|", 1);

        if(args[1])
        {
            let gay = args[1].includes('gay');
            let prn = (args[2]) ? await fromPH(gay, args[1], args[2]) : await fromPH(gay, args[1]);
            
            for (let x of prn)
            {
                let embed = new SafeEmbed().setColor("#FFA500");
                embed.setImage(x.thumb).setTitle(x.title).setURL(x.link).setFooter(`Długość: ${x.duration}`).setAuthor(`PornHub${gay ? ' Gay' : ''}`, "https://i.imgur.com/VVEYgqA.jpg",`https://pornhub.com${gay ? '/gayporn' : ''}`);
                Utils.send(msg.channel, embed);
            }

            if(prn.length == 0) Utils.send(msg.channel, new SafeEmbed().setColor("#FFA500").setDescription(`**${msg.author.tag}** nie znaleziono!`));
        }
    }
}