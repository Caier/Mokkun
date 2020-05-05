import fs from 'fs-extra';
import path from 'path';
import { Mokkun } from '../../mokkun';
import { TextChannel } from 'discord.js';
import files from './files';

export async function _newsletter(bot: Mokkun) {
    if(bot.loopExecCount % 15 != 0) return;
    let prevRes: any = (fs.existsSync(files.prevRes)) ? fs.readFileSync(files.prevRes).toString() : "{}";
    prevRes = JSON.parse(prevRes);
    let newsSubs = bot.db.get(`System.newsSubs`);
    let news = await require('./ztm.js').checkZTMNews();
    
    if(JSON.stringify(news.komunikaty) == JSON.stringify(prevRes.komunikaty) || JSON.stringify(news.komunikaty) == '[{"tytul":null,"tresc":null,"data_rozpoczecia":null,"data_zakonczenia":null}]') return;
    for (let x of news.komunikaty)
    {
        let embed = new bot.RichEmbed().setColor(13632027).setTitle(x.tytul).setDescription(x.tresc).setFooter(`Wygasa: ${x.data_zakonczenia}`);
        for(let c of newsSubs.users)
            bot.users.resolve(c).send(embed);
        for(let c of newsSubs.channels)
            (bot.channels.resolve(c) as TextChannel).send(embed)
    }
    fs.writeFileSync(files.prevRes, JSON.stringify(news));
}

export async function _reminders(bot: Mokkun) {
    let rems = bot.db.get(`System.reminders`);
    for(let x of rems)
    {
        if(x.boomTime - Date.now() <= 0)
        {
            let embed = new bot.RichEmbed().setColor("#007F00").setTitle("Przypomnienie").setDescription(x.content + `\n\n\nod: \`${x.authorLit}\``).setFooter(`id: ${x.id}`);
            let target = (x.where.isUser) ? "users" : "channels";
            let chan = (bot as any)[target].resolve(x.where.channel);
            chan && chan.send(embed);
            rems = rems.filter((e: any) => e.id != x.id);
            bot.db.save(`System.reminders`, rems);
        }
    }
}