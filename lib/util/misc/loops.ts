const ztm = require("../util/ztm");
import fs from 'fs-extra';
import path from 'path';
import { Mokkun } from '../mokkun';

export async function _newsletter(bot: Mokkun) {
    let prevRes = (fs.existsSync(path.join(__dirname, '..', bot.db.get(`System.files.prevRes`)))) ? fs.readFileSync(path.join(__dirname, '..', bot.db.get(`System.files.prevRes`))) : "{}";
    prevRes = JSON.parse(prevRes);
    let newsSubs = bot.db.get(`System.newsSubs`);
    let news = await ztm.checkZTMNews();
    
    if(JSON.stringify(news.komunikaty) == JSON.stringify(prevRes.komunikaty) || JSON.stringify(news.komunikaty) == '[{"tytul":null,"tresc":null,"data_rozpoczecia":null,"data_zakonczenia":null}]') return;
    for (let x of news.komunikaty)
    {
        let embed = new bot.RichEmbed().setColor(13632027).setTitle(x.tytul).setDescription(x.tresc).setFooter(`Wygasa: ${x.data_zakonczenia}`);
        for(let c of newsSubs.users)
            bot.users.resolve(c).send(embed);
        for(let c of newsSubs.channels)
            bot.channels.resolve(c).send(embed)
    }
    fs.writeFileSync(path.join(__dirname, '..', bot.db.get(`System.files.prevRes`) || "files/temp"), JSON.stringify(news));
}

export async function _reminders(bot: Mokkun) {
    let rems = bot.db.get(`System.reminders`);
    for(let x of rems)
    {
        if(x.boomTime - Date.now() <= 0)
        {
            let embed = new bot.RichEmbed().setColor("#007F00").setTitle("Przypomnienie").setDescription(x.content + `\n\n\nod: \`${x.authorLit}\``).setFooter(`id: ${x.id}`);
            let target = (x.where.isUser) ? "users" : "channels";
            let chan = bot[target].resolve(x.where.channel);
            chan && chan.send(embed);
            rems = rems.filter(e => e.id != x.id);
            bot.db.save(`System.reminders`, rems);
        }
    }
}