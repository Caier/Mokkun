const { fromNH } = require("../searchMethods");

module.exports = {
    name: 'nh',
    description: 'Doujiny na wyciągnięcie ręki!',
    usage: '`$pnh {tagi | numerek | URL}` - wyszukuje specyficzny doujin\n`$pnh` - losowy doujin',
    async execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, "|");

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
                for (x of ['⏮','◀','▶','⏭','2⃣','5⃣','🔟','🔀','❌'])
                    await nMsg.react(x);

                bot.on("messageReactionAdd", eventL = async (react, user) =>
                {
                    let emoji = react.emoji.toString();
                    setTimeout(f=>{bot.removeListener("messageReactionAdd", eventL);}, 1800000);

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
}