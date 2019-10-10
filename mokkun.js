      Discord = require("discord.js");
      bot =     new Discord.Client();
const config =  require("./config.json");
const { setup, embgen, getArgs } = require("./setup");
const fs =      require("fs");
const { isEqual } = require("underscore");
const dotenv = require('dotenv');
      dotenv.config(); 

exports.sendMsg = function(target, address, content){              
    if(target == 'channel')
        bot.channels.get(address).send(content);
    else if(target == 'user')
        bot.users.get(address).send(content);
}

if(!process.env.TOKEN || !process.env.PREFIX || !process.env.BOT_OWNER) {
    console.log(`Brak${(!process.env.TOKEN) ? ' tokena,' : ''}${(!process.env.PREFIX) ? ' prefixu,': ''}${(!process.env.BOT_OWNER) ? ' id ownera bota' : ''}`);
    process.exit(1);
}

setup();                                                            

bot.login(process.env.TOKEN).catch(e => {console.error(e); process.exit(1);});

const color = '#ffffff';
prefix = process.env.PREFIX;
commands = new Discord.Collection();
commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (file of commandFiles) {
	command = require(`./commands/${file}`);
	commands.set(command.name, command);
}

bot.on("error", err => console.error(err.message)); //temporary fix for an unknown websocket exception

bot.on("message", async msg => 
{
    if (!msg.content.startsWith(prefix) || msg.author.bot) return;

    if(msg.channel.type != 'dm')
        if (!fs.existsSync(`./filespace/${msg.guild.id}`)) 
            fs.mkdirSync(`./filespace/${msg.guild.id}`);
    else
        if (!fs.existsSync(`./filespace/${msg.channel.id}`)) 
            fs.mkdirSync(`./filespace/${msg.channel.id}`);
    
    let userStorage = {};
    if(fs.existsSync(`./filespace/${msg.author.id}/userstorage.json`))
        userStorage = JSON.parse(fs.readFileSync(`./filespace/${msg.author.id}/userstorage.json`));
    msg.author.storage = Object.assign({}, userStorage);

    const args = getArgs(msg.content);
    const command = args[0];
    const filter = (fs.existsSync(config.settings.variables.lockcom)) ? JSON.parse(fs.readFileSync(config.settings.variables.lockcom)) : [];

    if (!commands.has(command)) return;

    if (filter.includes(command))
    {
        msg.channel.send(embgen(color, `Komenda została zablokowana`));
        return;
    }

    if (commands.get(command).ownerOnly && msg.author.id != process.env.BOT_OWNER)
    {
        msg.channel.send(embgen(color, `Z komendy może korzystać tylko owner bota`));
        return;
    }

    if (msg.channel.type == 'dm' && commands.get(command).notdm)
    {
        msg.channel.send(embgen(color, `Z tej komendy nie można korzystać na PRIV!`));
        return;
    }

    try {
        await commands.get(command).execute(msg, args);
        if(!isEqual(userStorage, msg.author.storage)) {
            fs.existsSync(`./filespace/${msg.author.id}`) || fs.mkdirSync(`./filespace/${msg.author.id}`);
            fs.writeFileSync(`./filespace/${msg.author.id}/userstorage.json`, JSON.stringify(msg.author.storage));
        }
    } catch (err) {
        console.error(err);
        msg.channel.send(embgen(color, "Wystąpił błąd podczas wykonywania komendy\n\n" + err));
    }
});