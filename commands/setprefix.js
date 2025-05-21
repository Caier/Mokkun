module.exports = {
    name: "Ustaw Prefix",
    description: "Zmienia prefix komend dla serwera",
    usage: ``,
    notdm: true,
    permissions: ["MANAGE_GUILD"],
    execute(msg, args, bot) {
        if(!args[1]) return;
        if(args[1].length > 10) {
            msg.channel.send(bot.embgen(bot.sysColor, `Zbyt długi prefix (max. 10)`));
            return;
        }
        bot.db.save(`Data.${msg.guild.id}.prefix`, args[1]);
        msg.channel.send(bot.embgen(bot.sysColor, `Zmieniono prefix na ${args[1]}`));
    }
}