const { fromR34xxx } = require("../searchMethods");

module.exports = {
    name: 'r34',
    description: 'Rule 34 - obrazki kotków na wyciągnięcie ręki',
    usage: '`$pr34 {wyszukanie} | (opcjonalnie){ilość wyników max. 10}` - zobacz sam',
    async execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, "|", 1);
        const color = "#e400e8";

        msg.channel.send(bot.embgen(color, `Zbieranie postów...`)).then(async msgn => 
        {
            let imgs = (args[1] == '') ? await fromR34xxx(null, args[2]) : (!args[1]) ? await fromR34xxx() : (args[2]) ? await fromR34xxx(args[1], args[2]) : await fromR34xxx(args[1]);
     
            for (x of imgs)
            {
                if(x.tags != "video")
                {
                    let embed = new bot.RichEmbed();
                    embed.setFooter(x.tags).setImage(x.link).setTitle((!args[1] || args[1] == '') ? "random" : args[1]).setURL(x.link).setColor(color).setAuthor("rule34", "https://i.imgur.com/vRZar64.png", "http://rule34.xxx/");
                    msg.channel.send(embed);
                } 
                else msg.channel.send(x.link);
            }
    
            if(imgs == 0) msgn.edit(bot.embgen(color, `**${msg.author.tag}** nie znaleziono!`));
            else msgn.delete(100);
        });
    }
}