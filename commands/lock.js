module.exports = {
    name: 'lock',
    description: 'blokuje komendy na kanale',
    usage: '$plock {komenda}',
    notdm: true,
    ownerOnly: true,
    execute(msg, args, bot)
    {
        if(!args[1]) return;

        if((bot.db.get(`Data.${msg.channel.id}.lockedComs`) || []).includes(args[1])) {
            bot.db.save(`Data.${msg.channel.id}.lockedComs`, bot.db.get(`Data.${msg.channel.id}.lockedComs`).filter(c => c != args[1]));
            msg.channel.send(bot.embgen(bot.sysColor, `Odblokowano komendę ${args[1]}`));
        }
        else if(bot.commands.has(args[1]) && args[1] != this.name) {
            bot.db.save(`Data.${msg.channel.id}.lockedComs`, [...(bot.db.get(`Data.${msg.channel.id}.lockedComs`) || []), args[1]]);
            msg.channel.send(bot.embgen(bot.sysColor, `Zablokowano komendę ${args[1]}`));
        }
    }
}