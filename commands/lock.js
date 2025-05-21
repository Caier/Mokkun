module.exports = {
    name: 'lock',
    description: 'blokuje komendy na kanale',
    usage: '$plock {komenda}',
    aliases: ['unlockAll'],
    notdm: true,
    ownerOnly: true,
    execute(msg, args, bot)
    {
        args = bot.getArgs(msg.content, msg.prefix, null, null, true);
        if(args[0] == 'unlockAll') {
            let guildLock = args[1] == "guild";
            bot.db.save(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`, undefined);
            msg.channel.send(bot.embgen(bot.sysColor, `Odblokowano wszystkie komendy na tym ${guildLock ? 'serwerze' : 'kanale'}`));
            return;
        }
        if(!args[1]) return;
        if(typeof args[1] == 'string')
            args[1] = [args[1]];

        let out = {
            locked: [],
            unlocked: [],
            msg: ""
        };
        let guildLock = args[2] == "guild";
        let curLocks = bot.db.get(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`) || [];

        for(let cmd of args[1]) {
            if(curLocks.includes(cmd)) {
                curLocks = curLocks.filter(c => c != cmd);
                out.unlocked.push(cmd);
            }
            else if(bot.commands.has(cmd) && cmd != this.name) {
                curLocks.push(cmd);
                out.locked.push(cmd);
            }
        }
        
        if(curLocks.length == 0) curLocks = undefined;
        bot.db.save(`Data.${msg[guildLock ? "guild" : "channel"].id}.lockedComs`, curLocks);

        if(out.locked.length != 0) 
            out.msg += `Zablokowano komendę/y \`${out.locked.join(', ')}\` na tym ${guildLock ? 'serwerze' : 'kanale'}\n`;
        if(out.unlocked.length != 0)
            out.msg += `Odblokowano komendę/y \`${out.unlocked.join(', ')}\` na tym ${guildLock ? 'serwerze' : 'kanale'}\n`;
        if(out.msg.length != 0) msg.channel.send(bot.embgen(bot.sysColor, out.msg));
    }
}