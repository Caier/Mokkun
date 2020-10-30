import * as ztm from '../../util/misc/ztm';
import fs from 'fs';
import { register, CmdParams as c, group, extend, permissions } from '../../util/cmdUtils';
import { SafeEmbed } from '../../util/embed/SafeEmbed';
import { MessageReaction, User, TextChannel, Message } from 'discord.js';
import Utils from '../../util/utils';
import { SilentError } from '../../util/errors/errors';
import { SIPResponse } from '../../util/interfaces/ztm';

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

    static genEstEmb(data: SIPResponse) {
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
        .setDescription('\u200b')
        .addFields(!data.estimates.length ? [{name: '\u200b', value: "brak odjazdów w przeciągu 30 min."}]
        : data.estimates.map(i => ({name: `**${i.routeId} ${i.headsign}**`, value: `${i.vehId}\n**${i.relativeTime > 0 ? `za ${i.relativeTime} min. **[${i.estTime}]` : '**>>>>**'}`})));
    }

    @register('szacowane czasy odjazdy dla danego przystanku', '`$pztm {skrócona nazwa przystanku np. \'pias3\' (Piastowska 3) lub ID przystanku}`')
    static async ztm(msg: c.m, args: c.a, bot: c.b) {
        args = bot.newArgs(msg, {freeargs: 1});

        let send = (cont: any, ID: string|number) =>
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
            let result = await ztm.getShort(args[1]).catch(err => {
                msg.channel.send(bot.emb('Wyszukanie nie spełnia wymogów', 13632027, true).setDescription('Wyszukanie musi składać się z min. 3 znaków. \nPrzykłady:\n`pomo` - wyszuka wszystki przystanki, które zaczynają się od, lub zawierają w sobie "pomo"\n\n`oli1` lub `oli01` lub `oli 1` lub `oli 01` - tak jak poprzednio, dodatkowo odfiltruje przystanki których numer jest inny niż 1\n\n`dwo gł` lub `d g` lub `d g 4` lub `d g4`- wyszuka wszystkie przystanki, których kolejne słowa w nazwie zaczynają się od podanych liter rozdzielonych spacją'));
                throw new SilentError(err);
            });
            if(result.length == 0) {
                msg.channel.send(bot.emb('Nie znaleziono', 13632027, true));
                return;
            }
            else if(result.length == 1)
                send(H.genEstEmb(await result[0].delay()), result[0].stopId);
            else {
                let prz = "";
                for(let x = 0; x < result.length; x++)
                    prz += `${x}. ${result[x].stopDesc} ${result[x].stopCode}\n`;
                let embed = new bot.RichEmbed().setColor(13632027).setDescription(`Znaleziono więcej niż jeden pasujący przystanek. Wybierz jeden odpisując numer lub \"stop\" aby zakończyc.\n\n${prz}`);
                
                msg.channel.send(embed).then(async nmsg => {
                    let coll = nmsg.channel.createMessageCollector((rmsg: Message) => rmsg.author.id == msg.author.id, {time: Utils.parseTimeStrToMilis('2m')});
                    let remsg: Message;
                    coll.on('collect', async rmsg => {
                        remsg = rmsg;
                        if(!isNaN(+rmsg.content) && +rmsg.content >= 0 && +rmsg.content < result.length) {
                            send(H.genEstEmb(await result[+rmsg.content].delay()), result[+rmsg.content].stopId);
                            coll.stop();
                        }
                        else if(rmsg.content == 'stop')
                            coll.stop();
                    });
                    coll.on('end', () => {
                        remsg?.delete({timeout: 150});
                        nmsg.delete({timeout: 150});
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