const config = require("../config.json");
const ztm =    require("../ztm");
const setup =  require("../setup");
const fs =     require("fs");

module.exports = {
    name: 'ztm',
    description: 'zbiór komend związanych z ZTM',
    usage: '`ztm search {numer przystanku} {nazwa przystanku}` - wyszukuje szacowane czasy odjazdu dla danego przystanku\n`ztm n {id przystanku}` - to samo tylko przez ID przystanku\n`ztm {zapisany skrót przystanku}` - to samo tylko z własnym skrótem przystanku\n`ztm add {nazwa skrótu} {ID}` - dodaje skrót przystanku (tylko owner bota)\n`ztm subscribe` - subskrybuje newsletter ztm',
    async execute(msg, args)
    {
        class embedEstimates {
            constructor(data) {
                this.data = data;
                this.embed = new Discord.RichEmbed().setColor(13632027)
                .setTitle(`${data.stopName} ${data.stopNumer} (id: ${data.numerTras})`)
                .setDescription((data.updated) ? 'updated stops.json' : '\u200b');
                if(data.estimates.length === 0) this.embed.addField('\u200b', "Brak danych o najbliższych odjazdach");

                for (var i of data.estimates) {
                    i.routeId = i.routeId.toString();
                    if(['4', '8'].includes(i.routeId[0]) && i.routeId.length >= 2) i.routeId = ((i.routeId[0] === '4') ? 'N' : 'T') + i.routeId.slice((i.routeId[1] === '0') ? 2 : 1);
                    
                    for (var z in veh)
                        for (var x in veh[z])
                            if (veh[z][x].numbers.includes(i.vehId))
                            {
                                i.vehId = (veh[z][x].type != "") ? `${veh[z][x].type} - ${veh[z][x].model} [${i.vehId}]` : `${veh[z][x].model} [${i.vehId}]`;
                                break;
                            }
                    this.embed.addField(`**${i.routeId}** ***${i.headsign}***`, `${i.vehId}\n**${i.estTime}**`);
                }
            }

            send() {
                msg.channel.send(this.embed).then(async nmsg => {
                    let eventL;
                    setTimeout(() => bot.removeListener("message", eventL), 86400000);
                    await nmsg.react('🔄');
                    bot.on("messageReactionAdd", eventL = async (react, user) => {
                        if(user.id != msg.author.id || react.message.id != nmsg.id) return;
                        if(react.emoji.toString() == '🔄') {
                            react.remove(user.id);
                            nmsg.edit(new embedEstimates(await ztm.getSIP(this.data.numerTras)).embed);
                        }
                    });
                });
            }
        }
       
        let veh = JSON.parse(fs.readFileSync(config.settings.variables.pojazdy));
        if(!msg.author.storage.hasOwnProperty('ztmShorts'))
                msg.author.storage.ztmShorts = {};

        if(args.length < 3 && msg.author.storage.ztmShorts[args[1]])
            new embedEstimates(await ztm.getSIP(msg.author.storage.ztmShorts[args[1]])).send();

        else if(args.length < 3 && args[1] != 'subscribe')
        {
            let result = await ztm.getShort(args[1]);
            if(result == 0) return;
            else if(result.length === 1) new embedEstimates(result[0].res).send();
            else
            {
                let prz = "";
                for(var x = 0; x < result.length; x++)
                    prz += `${x+1}. ${result[x].name}\n`;
                let embed = new Discord.RichEmbed().setColor(13632027).setDescription(`Znaleziono więcej niż jeden pasujący przystanek. Wybierz jeden odpisując numer lub \"stop\" aby zakończyc.\n\n${prz}`);
                
                msg.channel.send(embed).then(async nmsg => {
                    let eventL;
                    setTimeout(() => bot.removeListener("message", eventL), 600000);

                    bot.on("message", eventL = async rmsg => {
                        if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                        for(var x of result)
                            if(rmsg.content == x.num || rmsg.content == "stop") {
                                if(rmsg.content != "stop")
                                    new embedEstimates(x.res).send();
                                else
                                    msg.delete(100);
                                rmsg.delete(100);
                                nmsg.delete(100);
                                bot.removeListener("message", eventL);
                                break;
                            }
                    });
                });
            }
        }

        else if(args[1] === 'search')
        {
            for(i=4; i<args.length; i++)                //łączy ostatnie argumenty (nazwa przystanku)
              args[3] = args[3] + " " + args[i];

            new embedEstimates(await ztm.getSIP(args[2], args[3])).send();
        }

        else if(args[1] === 'n')
            new embedEstimates(await ztm.getSIP(args[2])).send();

        else if(args[1] === 'add')
        {
            msg.author.storage.ztmShorts[args[2]] = args[3];
            msg.channel.send(setup.embgen(13632027, `Zapisano id ${args[3]} jako ${args[2]}`));
        }

        else if(args[1] == 'subscribe')
        {
         
          if(config.settings.newsSubs.users.includes(msg.author.id)) {
            config.settings.newsSubs.users = config.settings.newsSubs.users.filter(x => x != msg.author.id);
            setup.updateConfig(config).then(e => {
                msg.channel.send(new Discord.RichEmbed().setDescription("Zostałeś usunięty z listy subskrybentów"));
            });
        }
        else {
            config.settings.newsSubs.users.push(`${msg.author.id}`);
            setup.updateConfig(config).then(e => {
                msg.channel.send(new Discord.RichEmbed().setDescription("Zostałeś dodany do listy subskrybentów sytuacji komunikacyjnej ZTM!\nWszelkie zmiany sytuacji zostaną wysłane na PRIV!"));
            });
        }
        }
    }

}