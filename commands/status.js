const fs = require("fs");
const setup = require("../setup");
const config = require("../config.json");
const vars = config.settings.variables;

module.exports = {
    name: 'status',
    description: 'zmienia status bota',
    usage: '`status {typ aktywności} {status}` - zmienia status (presence) bota',
    execute(msg)
    {
        args = setup.getArgs(msg.content, "|", 2);
        acceptable = ["PLAYING", "STREAMING", "LISTENING", "WATCHING"];

        if(args[1] && args[2])
        {
            if(acceptable.includes(args[1].toUpperCase()))
            {
                pres = [args[2], args[1]].join("|~|");
                fs.writeFileSync(vars.presence, pres);
                bot.user.setPresence({game: {name: args[2], type: args[1]}}).catch(err => {msg.channel.send(err.message);}).then(xxx => {msg.channel.send("Ustawiono status");});
            }
            else msg.channel.send(`Dostępne typy statusu:\n${acceptable.join("\n")}`);
        }
    }
}