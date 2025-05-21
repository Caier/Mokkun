module.exports = {
    name: 'status',
    description: 'zmienia status bota',
    usage: '`$pstatus {typ aktywności} {status}` - zmienia status (presence) bota',
    ownerOnly: true,
    execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, "|", 2);
        let acceptable = ["PLAYING", "STREAMING", "LISTENING", "WATCHING"];

        if(args[1] && args[2])
        {
            args[1] = args[1].toUpperCase();
            if(acceptable.includes(args[1]))
            {
                bot.db.save(`System.presence`, {name: args[2], type: args[1]});
                bot.user.setActivity(args[2], {type: args[1]})
                .then(() => msg.channel.send(bot.embgen(bot.sysColor, "Ustawiono status")));
            }
            else msg.channel.send(bot.embgen(bot.sysColor, `Dostępne typy statusu:\n${acceptable.join("\n")}`));
        }
    }
}