const setup = require("../setup");

module.exports = {
    name: 'link',
    description: 'Tworzy hiperłącze',
    usage: '`link hide | {nazwa} | {link}` - tworzy hiperłącze nie pokazując jego twórcy\n`link {nazwa} | {link}` - to samo tylko z twórcą',
    execute(msg)
    {
        args = setup.getArgs(msg.content, "|");

        embed = new Discord.RichEmbed()
            .setColor(Math.floor(Math.random()*16777215));

        if(args[1] == 'hide')
        {
            embed.setTitle(args[2]).setURL(args[3]);
            msg.delete(100);
            msg.channel.send(embed);
        } else if(args[1])
        {
            embed.setTitle(args[1]).setURL(args[2]).setFooter(msg.author.tag);
            msg.delete(100);
            msg.channel.send(embed);
        } else msg.channel.send("Nie wiesz jak użyć tej komendy? Wpisz `help link`");
    }
}