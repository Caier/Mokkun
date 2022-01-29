import { DiscordAPIError, TextChannel } from 'discord.js';
import { IRemind } from './util/interfaces/IRemind';
import { checkZTMNews } from './util/misc/ztm';
import Task from './util/tasks/Task';
import fs from 'fs';
import files from './util/misc/files';
import { ZTMNews } from './util/interfaces/ztm';

new Task(3000, async (self) => { //reminders
    let rems: IRemind[] = self.bot.db.System?.reminders || [];
    for(let r of rems) {
        if(+r.boomTime - Date.now() <= 0) {
            let emb = new self.bot.RichEmbed().setColor('#00ffff').setAuthor('Przypomnienie').setDescription(r.content).addField('Od', `<@${r.author}>`);
            try {
                let msg = (await ((await self.bot.channels.fetch(r.createdIn)) as any as TextChannel)?.send({embeds: [emb]}));
                if(msg)
                    rems = rems.filter(re => re.id != r.id);
            } catch(e) {
                if(e instanceof DiscordAPIError)
                    rems = rems.filter(re => re.id != r.id);
            }
            self.bot.db.save('System.reminders', rems);
        }
    }
});

new Task(60_000, async (self) => { //ztm sytuacja komunikacyjna
    let prevRes: ZTMNews = JSON.parse((fs.existsSync(files.prevRes)) ? fs.readFileSync(files.prevRes).toString() : "{}");
    let newsSubs = self.bot.db.get(`System.newsSubs`);
    let news = await checkZTMNews();
    
    if(JSON.stringify(news.komunikaty) == JSON.stringify(prevRes.komunikaty) || JSON.stringify(news.komunikaty) == '[{"tytul":null,"tresc":null,"data_rozpoczecia":null,"data_zakonczenia":null}]') return;
    for (let x of news.komunikaty) {
        let embed = new self.bot.RichEmbed().setColor(13632027).setTitle(x.tytul).setDescription(x.tresc).setFooter(`Wygasa: ${x.data_zakonczenia}`);
        for(let c of newsSubs.users)
            (self.bot.users.resolve(c) as any).send(embed);
        for(let c of newsSubs.channels)
            (self.bot.channels.resolve(c) as any).send(embed)
    }
    fs.writeFileSync(files.prevRes, JSON.stringify(news));
})