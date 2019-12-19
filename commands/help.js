module.exports = {
    name: 'help',
    description: 'pomoc',
    usage: '`$phelp {nazwa komendy}`',
    execute(msg, args, bot)
    {
        let color = '#ffafee'
        if(!args[1])
            msg.channel.send(bot.embgen(color, `**Lista komend:**\n${bot.commands.keyArray().join(", ")}\n\nAby dowiedzieć się więcej o danej komendzie wpisz \`${msg.prefix}help {nazwa komendy}\``));
        else 
            if(bot.commands.has(args[1])) {
                let cmd = bot.commands.get(args[1]);
                msg.channel.send(bot.embgen(color, `**Komenda: **${args[1]} (${cmd.name})\n\n**Opis: **${cmd.description}\n\n**Używanie: **${cmd.usage.replace(/\$p/g, msg.prefix)}`));
            }
    }
}