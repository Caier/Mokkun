import * as ztm from '../../util/misc/ztm';
import fs from 'fs';
import { register, CmdParams as c, group } from '../../util/cmdUtils';

//oh this is a shithole (transcoded from old version just to be compatible with command rewrite)

@group("Różne")
class Handler {
    @register('zbiór komend związanych z ZTM', '`$pztm search {numer przystanku} {nazwa przystanku}` - wyszukuje szacowane czasy odjazdu dla danego przystanku\n`$pztm n {id przystanku}` - to samo tylko przez ID przystanku\n`$pztm {zapisany skrót przystanku}` - to samo tylko z własnym skrótem przystanku\n`$pztm add {nazwa skrótu} {ID}` - dodaje skrót przystanku (tylko owner bota)\n`$pztm subscribe` - subskrybuje newsletter ztm')
    static async ztm(msg: c.m, args: c.a, bot: c.b) {
        class embedEstimates extends bot.RichEmbed {
            data: any;
            constructor(data: any) {
                super();
                if(!data) return;
                this.data = data;
                this.setColor(13632027)
                .setTitle(`${data.stopName} ${data.stopNumer} (id: ${data.numerTras})`)
                .setDescription((data.updated) ? 'updated stops.json' : '\u200b');
                if(data.estimates.length === 0) this.addField('\u200b', "Brak danych o najbliższych odjazdach");

                for (let i of data.estimates) {
                    i.routeId = i.routeId.toString();
                    if(['4', '8'].includes(i.routeId[0]) && i.routeId.length >= 2) i.routeId = ((i.routeId[0] === '4') ? 'N' : 'T') + i.routeId.slice((i.routeId[1] === '0') ? 2 : 1);
                    
                    for (let z in veh)
                        for (let x in veh[z])
                            if (veh[z][x].numbers.includes(i.vehId))
                            {
                                i.vehId = (veh[z][x].type != "") ? `${veh[z][x].type} - ${veh[z][x].model} [${i.vehId}]` : `${veh[z][x].model} [${i.vehId}]`;
                                break;
                            }
                    this.addField(`**${i.routeId}** ***${i.headsign}***`, `${i.vehId}\n**${i.estTime}**`);
                }
            }

            send() {
                msg.channel.send(this).then(async nmsg => {
                    let eventL: any;
                    setTimeout(() => bot.removeListener("message", eventL), 86400000);
                    await nmsg.react('🔄');
                    bot.on("messageReactionAdd", eventL = async (react: { message: { id: string; }; emoji: { toString: () => string; }; users: { remove: (arg0: any) => void; }; }, user: { id: string; }) => {
                        if(user.id == bot.user.id || react.message.id != nmsg.id) return;
                        if(react.emoji.toString() == '🔄') {
                            react.users.remove(user.id);
                            nmsg.edit(new embedEstimates(await ztm.getSIP(this.data.numerTras)));
                        }
                    });
                });
            }
        }
       
        let veh = JSON.parse(fs.readFileSync(bot.db.get(`System.files.pojazdy`)).toString() || "{}");

        if(args.length < 3 && bot.db.get(`Data.${msg.author.id}.ztmShorts.${args[1]}`))
            new embedEstimates(await ztm.getSIP(bot.db.Data[msg.author.id].ztmShorts[args[1]])).send();

        else if(args.length < 3 && args[1] != 'subscribe')
        {
            let result = await ztm.getShort(args[1]);
            if(result.length = 0) return;
            else if(result.length === 1) new embedEstimates(result[0].res).send();
            else
            {
                let prz = "";
                for(let x = 0; x < result.length; x++)
                    prz += `${x+1}. ${result[x].name}\n`;
                let embed = new bot.RichEmbed().setColor(13632027).setDescription(`Znaleziono więcej niż jeden pasujący przystanek. Wybierz jeden odpisując numer lub \"stop\" aby zakończyc.\n\n${prz}`);
                
                msg.channel.send(embed).then(async nmsg => {
                    let eventL: { (...args: any[]): void; (rmsg: any): Promise<void>; (...args: any[]): void; };
                    setTimeout(() => bot.removeListener("message", eventL), 600000);

                    bot.on("message", eventL = async (rmsg: { author: { id: string; }; channel: { id: string; }; content: string; delete: (arg0: { timeout: number; }) => void; }) => {
                        if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                        for(let x of result)
                            if(+rmsg.content == x.num || rmsg.content == "stop") {
                                if(rmsg.content != "stop")
                                    new embedEstimates(x.res).send();
                                else
                                    msg.delete({timeout: 150});
                                rmsg.delete({timeout: 150});
                                nmsg.delete({timeout: 150});
                                bot.removeListener("message", eventL);
                                break;
                            }
                    });
                });
            }
        }

        else if(args[1] === 'search')
        {
            for(let i=4; i<args.length; i++)                //łączy ostatnie argumenty (nazwa przystanku)
              args[3] = args[3] + " " + args[i];

            new embedEstimates(await ztm.getSIP(args[2], args[3])).send();
        }

        else if(args[1] === 'n')
            new embedEstimates(await ztm.getSIP(args[2])).send();

        else if(args[1] === 'add')
        {
            if(!/^[0-9]+$/.test(args[3])) {
                msg.channel.send(bot.embgen(13632027, "ID must be number only!"));
                return;
            }
            args[2] = args[2].replace(/\./g, "");
            bot.db.save(`Data.${msg.author.id}.ztmShorts.${args[2]}`, args[3]);
            msg.channel.send(bot.embgen(13632027, `Zapisano id ${args[3]} jako ${args[2]}`));
        }

        else if(args[1] == 'subscribe')
        {
            let sub = (msg.channel.type == 'dm') ? msg.author.id : msg.channel.id;
            let type = (msg.channel.type == 'dm') ? "users" : "channels";
            if((bot.db.get(`System.newsSubs.${type}`) || []).includes(sub)) {
                bot.db.save(`System.newsSubs.${type}`, bot.db.System.newsSubs[type].filter((x: string) => x != sub));
                msg.channel.send(bot.embgen(13632027, "Ten kanał został usunięty z listy subskrybentów"));
            } else {
                bot.db.save(`System.newsSubs.${type}`, (bot.db.get(`System.newsSubs.${type}`) || []).concat(sub));
                msg.channel.send(bot.embgen(13632027, "Ten kanał został dodany do listy subskrybentów sytuacji komunikacyjnej ZTM"));
            }
        }
    }
}

export = Handler;