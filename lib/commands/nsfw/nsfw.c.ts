import { group, aliases, register, CmdParams as c, nsfw, deprecated } from "../../util/cmdUtils";
import { fromGB, fromR34xxx, fromNH, fromPH } from '../../util/misc/searchMethods';
import Utils from "../../util/utils";
import { LoggedError } from "../../util/errors/errors";
import { SafeEmbed } from "../../util/embed/SafeEmbed";
import { Message, MessageReaction, User } from "discord.js";
import { IExtMessage } from "../../util/interfaces/DiscordExtended";

@nsfw
@group("NSFW")
export default class H {
    static async newPostReact(msg: Message, tags: string, method: 'r34'|'gb', bot: c.b, author: string) {
        await msg.react('🔄');
        await msg.react('🔒');
        let deletable = true;
        let coll = msg.createReactionCollector((react: MessageReaction, user: User) => !user.bot && ['🔄', '🔒'].includes(react.emoji.name), {time: Utils.parseTimeStrToMilis('10m')});
        let r = (react: MessageReaction, user: User) => {
            deletable = false;
            r = () => react.users.remove(user);
        };
        coll.on('collect', (react, user) => {
            if(react.emoji.name == '🔒')
                r(react, user);
            else if(react.emoji.name == '🔄') {
                if(deletable)
                    msg.delete({timeout: 150});
                react.remove();
                coll.stop();
                msg.content = `.${method} ${tags}`;
                msg.author = user;
                bot.commands.get(method).execute(msg as IExtMessage, [method, tags], bot);
            }
        });
    }

    @aliases('gelbooru')
    @register('G E L B O O R U - obrazki thotów na wyciągnięcie ręki', '`$pgb {wyszukanie}` - zobacz sam')
    static gb(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);
        const color = "#006ffa";

        msg.channel.send(bot.embgen(color, `Zbieranie postów...`)).then(async msgn => {
            let imgs = await fromGB(args[1]);

            for (let x of imgs) {
                let embed: any = new SafeEmbed();
                if(x.tags != "video") {
                    embed.setFooter(x.tags).setImage(x.link).setTitle((!args[1] || args[1] == '') ? "random" : args[1])
                         .setURL(x.page).setColor(color).setAuthor("Gelbooru", "https://pbs.twimg.com/profile_images/1118350008003301381/3gG6lQMl.png", "http://gelbooru.com/");
                    if(x.comments.length != 0) 
                        embed.addField(`${x.comments[0].name}:`, x.comments[0].comment);
                } 
                else embed = x.link;

                if(x.comments.length > 1) {
                    let emb = new SafeEmbed().setTitle("Komentarze").setColor(color);
                    x.comments.forEach(com => emb.addField(`${com.score}👍  ${com.name}:`, com.comment));
                    let embs = emb.populateEmbeds();
                    let [, nmsg] = await Utils.createPageSelector(msg.channel as any, [embed, ...(embs.length > 0 ? embs : [emb])], {emojis: [null, `◀`, `▶`]});
                    H.newPostReact(nmsg as c.m, args[1], 'gb', bot, msg.author.id);
                }
                else msg.channel.send(embed).then(nmsg => H.newPostReact(nmsg, args[1], 'gb', bot, msg.author.id));
            }
    
            if(imgs.length == 0)
                msgn.edit(bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`));
            else 
                msgn.delete({timeout: 150});
        }).catch(e => { throw new LoggedError(msg.channel as any, e.message) });
    }

    @aliases('rule34')
    @register('Rule 34 - obrazki kotków na wyciągnięcie ręki', '`$pr34 {wyszukanie}` - zobacz sam')
    static r34(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);
        const color = "#e400e8";

        msg.channel.send(bot.embgen(color, `Zbieranie postów...`)).then(async msgn => 
        {
            let imgs = await fromR34xxx(args[1]);

            for (let x of imgs)
            {
                if(x.tags != "video")
                {
                    let embed = new SafeEmbed();
                    embed.setFooter(x.tags).setImage(x.link).setTitle((!args[1] || args[1] == '') ? "random" : args[1]).setURL(x.link).setColor(color).setAuthor("rule34", "https://i.imgur.com/vRZar64.png", "http://rule34.xxx/");
                    msg.channel.send(embed).then(mmsg => H.newPostReact(mmsg, args[1], 'r34', bot, msg.author.id));
                } 
                else msg.channel.send(x.link).then(mmsg => H.newPostReact(mmsg, args[1], 'r34', bot, msg.author.id));
            }
    
            if(imgs.length == 0) msgn.edit(bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`));
            else msgn.delete({timeout: 150});
        });
    }

    @aliases('nhentai')
    @register('Doujiny na wyciągnięcie ręki!', '`$pnh {tagi | numerek | URL}` - wyszukuje specyficzny doujin\n`$pnh` - losowy doujin')
    static async nh(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);

        let doujin = (args[1]) 
        ? (/^[0-9]+$/.test(args[1])) 
            ? await fromNH("https://nhentai.net/g/" + args[1]) 
            : (/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(args[1])) 
                ? await fromNH(args[1])
                : await fromNH(null, args[1])
        : await fromNH();
       
        if(!doujin) {
            msg.channel.send(new SafeEmbed().setColor("#f40e29").setDescription(`**${msg.author.tag}** nie znaleziono!`));
            return;
        }

        let embed = new SafeEmbed().setImage(doujin.thumb).setTitle(doujin.name).setURL(doujin.link).addField("Tagi: ", doujin.tags).setFooter(`Strony: ${doujin.maxPage}`).setColor("#f40e29").setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png");

        msg.channel.send(embed).then(async nMsg => 
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
                        nMsg.edit(new SafeEmbed().setTitle(doujin.name).setURL(doujin.link + curPage).setImage(newpageURL).setColor("#f40e29").setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png").setFooter(`Strona ${curPage}/${doujin.maxPage}`));
                    }
                    else if(emoji == '⏮')
                    {
                        react.users.remove(user.id);
                        nMsg.edit(embed);
                        curPage = 0;
                    }
                    else if(emoji == '❌')
                    {
                        nMsg.edit(new SafeEmbed().setColor('#f40e29').setTitle("link").setURL(doujin.link).setDescription(`**${msg.author.tag}** zakończono czytanie!`));
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
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);

        if(args[1])
        {
            let gay = args[1].includes('gay');
            let prn = (args[2]) ? await fromPH(gay, args[1], args[2]) : await fromPH(gay, args[1]);
            
            for (let x of prn)
            {
                let embed = new SafeEmbed().setColor("#FFA500");
                embed.setImage(x.thumb).setTitle(x.title).setURL(x.link).setFooter(`Długość: ${x.duration}`).setAuthor(`PornHub${gay ? ' Gay' : ''}`, "https://i.imgur.com/VVEYgqA.jpg",`https://pornhub.com${gay ? '/gayporn' : ''}`);
                msg.channel.send(embed);
            }

            if(prn.length == 0) msg.channel.send(new SafeEmbed().setColor("#FFA500").setDescription(`**${msg.author.tag}** nie znaleziono!`));
        }
    }
}