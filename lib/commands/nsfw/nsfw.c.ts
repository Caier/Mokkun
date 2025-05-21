import { group, aliases, register, CmdParams as c, nsfw } from "../../util/cmdUtils";
import { fromGB, fromR34xxx, fromNH, fromPH } from '../../util/misc/searchMethods';

@nsfw
@group("NSFW")
class Handler {
    @aliases('gelbooru')
    @register('G E L B O O R U - obrazki thotów na wyciągnięcie ręki', '`$pgb {wyszukanie} | (opcjonalnie){ilość wyników max. 10}` - zobacz sam')
    static gb(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);
        const color = "#006ffa";

        msg.channel.send(bot.embgen(color, `Zbieranie postów...`)).then(async msgn => 
        {
            let imgs = (args[1] == '') ? await fromGB(null, args[2]) : (!args[1]) ? await fromGB() : (args[2]) ? await fromGB(args[1], args[2]) : await fromGB(args[1]); 
     
            for (let x of imgs)
            {
                let embed: any = new bot.RichEmbed();
                if(x.tags != "video")
                {
                    embed.setFooter(x.tags).setImage(x.link).setTitle((!args[1] || args[1] == '') ? "random" : args[1]).setURL(x.page).setColor(color).setAuthor("Gelbooru", "https://pbs.twimg.com/profile_images/1118350008003301381/3gG6lQMl.png", "http://gelbooru.com/");
                    if(x.comments.length != 0 && x.comments[0].comment.length < 1000) embed.addField(`${x.comments[0].name}:`, x.comments[0].comment);
                } 
                else embed = x.link;

                msg.channel.send(embed).then(async nmsg => {
                    if(x.comments.length <= 1) return;

                    for(let emo of [`⏮`, `◀`, `▶`])
                        await nmsg.react(emo);

                    let eventL: any;
                    let page = 0;
                    let combeds = [new bot.RichEmbed().setTitle("Komentarze").setColor(color)];
                    setTimeout(() => bot.removeListener("messageReactionAdd", eventL), 120000);

                    for(let c of x.comments) {
                        while(true) {
                            let emb = combeds[combeds.length - 1]
                            if(c.comment.length > 1023) 
                                c.comment = c.comment.slice(0, 1020) + "...";
                            if(emb.fields.length < 25 && emb.length + c.name.length + c.score.toString().length + c.comment.length < 5990) {
                                emb.addField(`${c.score}👍  ${c.name}:`, c.comment);
                                break;
                            } 
                            else combeds.push(new bot.RichEmbed().setTitle("Komentarze").setColor(color));
                        }
                    }

                    for(let e = 1; e-1 < combeds.length; e++)
                        combeds[e-1].setFooter(`${e}/${combeds.length}`)

                    bot.on("messageReactionAdd", eventL = async (react: { message: { id: string; }; emoji: { toString: () => any; }; users: { remove: (arg0: any) => void; }; }, user: { id: string; }) => {
                        if(react.message.id != nmsg.id || user.id == bot.user.id) return;
                        let emoji = react.emoji.toString();
                        react.users.remove(user.id);

                        if(emoji == `⏮`) {
                            nmsg.edit(embed);
                            page = 0;
                        }
                        else if ((emoji == `◀` && page > 0) || (emoji == `▶` && page < combeds.length)) {
                            page = (emoji == `◀`) ? page - 1 : page + 1;
                            nmsg.edit((page <= 0) ? embed : combeds[page-1]);
                        }
                    });
                })
            }
    
            if(imgs.length == 0) msgn.edit(bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`));
            else msgn.delete({timeout: 150});
        });
    }

    @aliases('rule34')
    @register('Rule 34 - obrazki kotków na wyciągnięcie ręki', '`$pr34 {wyszukanie} | (opcjonalnie){ilość wyników max. 10}` - zobacz sam')
    static r34(msg: c.m, args: c.a, bot: c.b) {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);
        const color = "#e400e8";

        msg.channel.send(bot.embgen(color, `Zbieranie postów...`)).then(async msgn => 
        {
            let imgs = (args[1] == '') ? await fromR34xxx(null, args[2]) : (!args[1]) ? await fromR34xxx() : (args[2]) ? await fromR34xxx(args[1], args[2]) : await fromR34xxx(args[1]);
     
            for (let x of imgs)
            {
                if(x.tags != "video")
                {
                    let embed = new bot.RichEmbed();
                    embed.setFooter(x.tags).setImage(x.link).setTitle((!args[1] || args[1] == '') ? "random" : args[1]).setURL(x.link).setColor(color).setAuthor("rule34", "https://i.imgur.com/vRZar64.png", "http://rule34.xxx/");
                    msg.channel.send(embed);
                } 
                else msg.channel.send(x.link);
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
            msg.channel.send(new bot.RichEmbed().setColor("#f40e29").setDescription(`**${msg.author.tag}** nie znaleziono!`));
            return;
        }

        let embed = new bot.RichEmbed().setImage(doujin.thumb).setTitle(doujin.name).setURL(doujin.link).addField("Tagi: ", doujin.tags).setFooter(`Strony: ${doujin.maxPage}`).setColor("#f40e29").setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png");

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
                        nMsg.edit(new bot.RichEmbed().setTitle(doujin.name).setURL(doujin.link + curPage).setImage(newpageURL).setColor("#f40e29").setAuthor("nhentai", "https://i.imgur.com/D7ryKWh.png").setFooter(`Strona ${curPage}/${doujin.maxPage}`));
                    }
                    else if(emoji == '⏮')
                    {
                        react.users.remove(user.id);
                        nMsg.edit(embed);
                        curPage = 0;
                    }
                    else if(emoji == '❌')
                    {
                        nMsg.edit(new bot.RichEmbed().setColor('#f40e29').setTitle("link").setURL(doujin.link).setDescription(`**${msg.author.tag}** zakończono czytanie!`));
                        nMsg.reactions.removeAll();
                        bot.removeListener("messageReactionAdd", eventL);
                    }
                });
            });
    }

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
                let embed = new bot.RichEmbed().setColor("#FFA500");
                embed.setImage(x.thumb).setTitle(x.title).setURL(x.link).setFooter(`Długość: ${x.duration}`).setAuthor(`PornHub${gay ? ' Gay' : ''}`, "https://i.imgur.com/VVEYgqA.jpg",`https://pornhub.com${gay ? '/gayporn' : ''}`);
                msg.channel.send(embed);
            }

            if(prn.length == 0) msg.channel.send(new bot.RichEmbed().setColor("#FFA500").setDescription(`**${msg.author.tag}** nie znaleziono!`));
        }
    }
}

export = Handler;