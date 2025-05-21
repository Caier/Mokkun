module.exports = {
    name: 'link',
    description: 'Tworzy hiperłącze',
    usage: '`$plink hide | {nazwa} | {link}` - tworzy hiperłącze nie pokazując jego twórcy\n`$plink {nazwa} | {link}` - to samo tylko z twórcą',
    execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, "|");

        embed = new bot.RichEmbed()
            .setColor(Math.floor(Math.random()*16777215));

        if(args[1] == 'hide')
        {
            embed.setTitle(args[2]).setURL(args[3]);
            msg.delete({timeout: 150});
            msg.channel.send(embed);
        } else if(args[1])
        {
            embed.setTitle(args[1]).setURL(args[2]).setFooter(msg.author.tag);
            msg.delete({timeout: 150});
            msg.channel.send(embed);
        } else msg.channel.send("Nie wiesz jak użyć tej komendy? Wpisz `help link`");
    }
}