const rp = require("request-promise");
const $ =  require("cheerio");

module.exports = {
    name: 'ph',
    description: 'Wyszukiwarka PornHuba',
    usage: '`$pph {wyszukanie} | (opcjonalnie){ilość wyników max. 5}` - zobacz sam',
    async execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, "|");

        async function fromPH(gay, tags, much)
        {
            body = await rp(`https://www.pornhub.com/${gay ? 'gay/' : ''}video/search?search=${encodeURI(tags.replace(/ /g, '+'))}`, {encoding: null, rejectUnauthorized: false, headers: {"user-agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/41.0.2228.0 Safari/537.36"}})
            .catch(err => {});
            try {body = body.toString();}
            catch (e) {return [];}
            links = [];

            $("#videoSearchResult div.img.fade.videoPreviewBg.fadeUp > a", body).each((i, elem) => {
                links.push({
                                "link": "https://www.pornhub.com" + $(elem).attr('href'),
                                "title": $(elem).attr('title'),
                                "thumb": $(elem).children('img').attr("data-thumb_url"),
                                "duration": $(elem).parent().children('.marker-overlays').text().replace(/[ \nA-z]/g, "")
                            });
            });

            much = (!much) ? 1 : (much > 5) ? 5 : much;

            while(links.length > much)
                links.splice(Math.floor(Math.random() * (links.length)), 1);
            
            return links;
        }

        if(args[1])
        {
            gay = (args[1].includes('gay')) ? true : false;
            prn = (args[2]) ? await fromPH(gay, args[1], args[2]) : await fromPH(gay, args[1]);
            
            for (x of prn)
            {
                embed = new bot.RichEmbed().setColor("#FFA500");
                embed.setImage(x.thumb).setTitle(x.title).setURL(x.link).setFooter(`Długość: ${x.duration}`).setAuthor(`PornHub${gay ? ' Gay' : ''}`, "https://i.imgur.com/VVEYgqA.jpg",`https://pornhub.com${gay ? '/gayporn' : ''}`);
                msg.channel.send(embed);
            }

            if(prn == 0) msg.channel.send(new bot.RichEmbed().setColor("#FFA500").setDescription(`**${msg.author.tag}** nie znaleziono!`));
        }
    }
}