const { fromPH } = require('../util/searchMethods');

module.exports = {
    name: 'ph',
    description: 'Wyszukiwarka PornHuba',
    usage: '`$pph {wyszukanie} | (opcjonalnie){ilość wyników max. 5}` - zobacz sam',
    async execute(msg, args, bot)
    {
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

            if(prn == 0) msg.channel.send(new bot.RichEmbed().setColor("#FFA500").setDescription(`**${msg.author.tag}** nie znaleziono!`));
        }
    }
}