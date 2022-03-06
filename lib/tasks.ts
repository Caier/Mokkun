import { DiscordAPIError, TextChannel } from 'discord.js';
import { IRemind } from './util/interfaces/IRemind';
import { checkZTMNews } from './util/misc/ztm';
import Task from './util/tasks/Task';
import fs from 'fs';
import files from './util/misc/files';
import { ZTMNews } from './util/interfaces/ztm';
import $ from 'cheerio';
import ax from 'axios';
import Utils from './util/utils';
import { IBooru } from './util/interfaces/misc';

new Task(3000, 'reminders', async self => {
    let rems: IRemind[] = self.bot.db.System?.reminders || [];
    for(let r of rems) {
        if(+r.boomTime - Date.now() <= 0) {
            let emb = new self.bot.RichEmbed().setColor('#00ffff').setAuthor('Reminder').setDescription(r.content).addField('From', `<@${r.author}>`);
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

new Task(60_000, 'ztm', async self => {
    let prevRes: ZTMNews = JSON.parse((fs.existsSync(files.prevRes)) ? fs.readFileSync(files.prevRes).toString() : "{}");
    let newsSubs = self.bot.db.get(`System.newsSubs`);
    let news = await checkZTMNews();
    
    if(JSON.stringify(news.komunikaty) == JSON.stringify(prevRes.komunikaty) || JSON.stringify(news.komunikaty) == '[{"tytul":null,"tresc":null,"data_rozpoczecia":null,"data_zakonczenia":null}]') return;
    for (let x of news.komunikaty) {
        let embed = new self.bot.RichEmbed().setColor(13632027).setTitle(x.tytul).setDescription(x.tresc).setFooter(`Wygasa: ${x.data_zakonczenia}`);
        for(let c of newsSubs.users)
            self.bot.users.resolve(c).send({ embeds: [embed] });
        for(let c of newsSubs.channels)
            (self.bot.channels.resolve(c) as TextChannel).send({ embeds: [embed] });
    }
    fs.writeFileSync(files.prevRes, JSON.stringify(news));
});

new Task(61_000, 'booruslist', async self => {
    if(fs.existsSync(files.boorus) && Date.now() - fs.statSync(files.boorus).mtimeMs < Utils.parseTimeStrToMilis('1d')) {
        if(!self.ownData)
            self.ownData = JSON.parse(fs.readFileSync(files.boorus).toString());
        return;
    }
    
    let boorus: IBooru[] = [];
    let promises = [];
    for(let i = 0; i <= 15; i++)
        promises.push(ax.get('https://booru.org/top?top_boorus%5Bcount%5D=200&top_boorus%5Bpage%5D=' + i).then(resp => {
            $('.top-boorus tbody > tr:nth-child(n+3)', resp.data).each((i, elem) => {
                boorus.push({
                    name: !$('.t > a > span', elem)?.hasClass('__cf_email__') ? $('.t > a', elem).text().trim() : (r => {
                        let o = '';
                        for(let i = 2, a = parseInt(r.slice(0, 2), 16); i < r.length; i += 2)
                            o += String.fromCharCode(parseInt(r.slice(i, i + 2), 16) ^ a);
                        return o;
                    })($('.t > a > span', elem).attr('data-cfemail')),
                    short: $('.n', elem).text().trim(),
                    images: +$('.i', elem).text().trim()
                });
            });
        }));

    await Promise.all(promises);
    self.ownData = boorus.sort((a, b) => b.images - a.images);
    fs.writeFileSync(files.boorus, JSON.stringify(boorus, null, 2));
});