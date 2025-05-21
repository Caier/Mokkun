module.exports = {
    name: 'ping',
    description: 'gra w ping ponga',
    usage: '`$pping` - REEEE',
    execute(msg, args, bot)
    {
        wiad = (Math.floor(Math.random()*500) == 232) ? `nou` : `**${msg.author.tag}** :ping_pong: ${bot.ping}ms`;
        msg.channel.send(new bot.RichEmbed().setColor("#1ece00").setDescription(wiad));
    }
}