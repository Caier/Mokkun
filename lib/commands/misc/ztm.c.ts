import * as ztm from '../../util/misc/ztm';
import fs from 'fs';
import { register, CmdParams as c, group, extend, permissions } from '../../util/cmdUtils';
import { SafeEmbed } from '../../util/embed/SafeEmbed';
import { MessageReaction, User, TextChannel } from 'discord.js';

export = H;

@group('ZTM')
@extend(H.mod)
class H {
    static veh: any;
    static mod(msg: c.m, args: c.a, bot: c.b) {
        if(!H.veh)
            H.veh = JSON.parse(fs.readFileSync(bot.db.get(`System.files.pojazdy`)).toString() || "{}");
        return [msg, args, bot];
    }

    static genEstEmb(data: any) {
        if(!data) return;
        let veh = H.veh;
        for (let i of data.estimates) {
            i.routeId = i.routeId.toString();
            if(['4', '8'].includes(i.routeId[0]) && i.routeId.length >= 2) 
                i.routeId = ((i.routeId[0] === '4') ? 'N' : 'T') + i.routeId.slice((i.routeId[1] === '0') ? 2 : 1);
            mainl:
            for (let z in veh)
                for (let x in veh[z])
                    if (veh[z][x].numbers.includes(i.vehId)) {
                        i.vehId = (veh[z][x].type != "") ? `${veh[z][x].type} - ${veh[z][x].model} [${i.vehId}]` : `${veh[z][x].model} [${i.vehId}]`;
                        break mainl;
                    }
        }
        return new SafeEmbed().setColor(13632027)
        .setAuthor(`${data.stopName} ${data.stopNumer} (id: ${data.numerTras})`)
        .setDescription((data.updated) ? 'updated stops.json' : '\u200b')
        .addFields(!data.estimates.length ? [{name: '\u200b', value: "Brak danych o najbliższych odjazdach"}]
        : data.estimates.map((i: any) => ({name: `**${i.routeId} ${i.headsign}**`, value: `${i.vehId}\n**${i.estTime}**`})));
    }

    @register('szacowane czasy odjazdy dla danego przystanku', '`$pztm {skrócona nazwa przystanku np. \'pias3\' (Piastowska 3) lub ID przystanku}`')
    static async ztm(msg: c.m, args: c.a, bot: c.b) {
        let send = (cont: any, ID: string) =>
            msg.channel.send(cont).then(async nmsg => {
                await nmsg.react('🔄');
                let coll = nmsg.createReactionCollector((react: MessageReaction, user: User) => !user.bot, {time: 86400000});
                coll.on('collect', async (react, user) => {
                    if(nmsg.channel instanceof TextChannel) react.users.remove(user.id);
                    nmsg.edit(H.genEstEmb(await ztm.getSIP(ID)));
                })
            });
        if(/^\d+$/.test(args[1]))
            send(H.genEstEmb(await ztm.getSIP(args[1])), args[1]);
        else if(args[1]) {
            let result = await ztm.getShort(args[1]);
            if(result.length == 0) 
                return;
            else if(result.length == 1)
                send(H.genEstEmb(result[0].res), result[0].res.numerTras);
            else {
                let prz = "";
                for(let x = 0; x < result.length; x++)
                    prz += `${x+1}. ${result[x].name}\n`;
                let embed = new bot.RichEmbed().setColor(13632027).setDescription(`Znaleziono więcej niż jeden pasujący przystanek. Wybierz jeden odpisując numer lub \"stop\" aby zakończyc.\n\n${prz}`);
                
                msg.channel.send(embed).then(async nmsg => {
                    let eventL: any;
                    setTimeout(() => bot.removeListener("message", eventL), 600000);

                    bot.on("message", eventL = async (rmsg: any) => {
                        if(rmsg.author.id != msg.author.id || rmsg.channel.id != msg.channel.id) return;

                        for(let x of result)
                            if(+rmsg.content == x.num || rmsg.content == "stop") {
                                if(rmsg.content != "stop")
                                    send(H.genEstEmb(x.res), x.res.numerTras);
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
        else
            bot.sendHelp(msg, 'ztm');
    }

    @permissions('MANAGE_CHANNELS')
    @register('subskrybuje sytuację komunikacyjną ZTM', '`$pztmsub`')
    static ztmsub(msg: c.m, args: c.a, bot: c.b) {
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