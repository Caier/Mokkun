module.exports = {
    name: 'ping',
    description: 'gra w ping ponga',
    usage: '`ping` - REEEE',
    execute(msg, args)
    {
        wiad = (Math.floor(Math.random()*500) == 232) ? `nou` : `**${msg.author.tag}** :ping_pong: ${bot.ping}ms`;
        msg.channel.send(new Discord.RichEmbed().setColor("#1ece00").setDescription(wiad));
    }
}