import ProviderResolver, { Departure, Station, StationDepartures } from "./ProviderResolver.js";
import fs from 'fs';
import files from "../misc/files.js";
import Utils from "../utils.js";
import Task from "../tasks/Task.js";
import ax from 'axios';
import $ from 'cheerio';
import SafeEmbed from "../embed/SafeEmbed.js";

const shitNames = {
    '7567': "Gdańsk Przymorze-Uniwersytet",
    '7617': "Gdańsk Żabianka-AWFiS",
    '6049': "Gdynia Stocznia-Uniwersytet Morski",
    '5926': "Gdynia Wzgórze Św.Maksymiliana",
    '6320': "Wejherowo-Nanice"
};

export default class extends ProviderResolver {
    private tokens = { body: '', headers: { cookie: '' } as { [prop: string]: string } };

    constructor() {
        super('SKM Trójmiasto');

        this.getTokens();
        
        new Task(3_600_000 + Utils.rand(800_000, 1_800_000), this.name + ' stops manager', async () => {
            if(fs.existsSync(files.stops(this.name)) && Date.now() - fs.statSync(files.stops(this.name)).mtimeMs < Utils.parseTimeStrToMilis('1d'))
                this.stops = JSON.parse(fs.readFileSync(files.stops(this.name)).toString());
            else
                await this.fetchStops();
        });
    }

    private async fetchStops() {
        let resp = await ax.get('https://www.skm.pkp.pl/');
        let stops: typeof this.stops = $('#station-start > option:not(:first-child)', resp.data).toArray().map(e => ({ stopName: $(e).text()!, stopId: $(e).attr('value')! }));
        for(let [id, name] of Object.entries(shitNames))
            stops.find(s => s.stopId == id)!.stopName = name;
        this.stops = stops;
        fs.writeFileSync(files.stops(this.name), JSON.stringify(this.stops, null, 2));
    }

    private async getTokens() {
        this.tokens.headers = { cookie: '' };
        let resp = await ax.get('https://portalpasazera.pl/Wyszukiwarka/ZnajdzPociag', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 '}});
        this.tokens.headers.cookie = resp.headers["set-cookie"]!.find(c => c.includes('Token'))!.split(' ')[0];
        this.tokens.body = $('input[name=__RequestVerificationToken]', resp.data).attr('value')!;
        let r = /headers: ?\{ ?'(.*?)': ?'(.*?)'/gm;
        let m;
        while(m = r.exec(resp.data))
            this.tokens.headers[m[1]] = m[2];
    }

    private async getStationDataOfficial(s: Station) {
        let resp = await ax.get('https://portalpasazera.pl/Wyszukiwarka/WyszukajStacje?wprowadzonyTekst=' + encodeURI(s.stopName.replace(/\./g, '')), { responseType: 'json' });
        return { id: resp.data[0].ID, key: resp.data[0].Key };
    }

    async queryStations(query: string): Promise<Station[]> {
        query = query.toLowerCase();
        let startsWithRes: Station[] = [], includesRes: Station[] = [], splitRes: Station[] = [];
        for(let s of this.stops) {
            if(s.stopName.toLowerCase().startsWith(query))
                startsWithRes.push(s);
            else if(s.stopName.toLowerCase().includes(query))
                includesRes.push(s);
            else if(query.split(' ').length > 1) {
                let Qwords = query.split(' ');
                let Swords = s.stopName.toLowerCase().trim().split(' ');
                if(Qwords.length != Swords.length)
                    continue;
                if(Qwords.every((w, i) => Swords[i].startsWith(w)))
                    splitRes.push(s);
            }
        }
        const sorter = (a: Station, b: Station) => `${a.stopName} ${a.stopCode}`.localeCompare(`${b.stopName} ${b.stopCode}`);
        return [...startsWithRes.sort(sorter), ...includesRes.sort(sorter), ...splitRes.sort(sorter)];
    }

    async getDepartures(station: Station, cont = true): Promise<StationDepartures> {
        let sData = await this.getStationDataOfficial(station);
        let token;
        try {
            token = (await ax.post('https://portalpasazera.pl/Wyszukiwarka/ZnajdzPociag', new URLSearchParams({
                'kryteria[O]': 'true',
                'kryteria[S]': sData.id,
                'kryteria[SK]': sData.key,
                'kryteria[G]': new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw' }).slice(0, -3),
                '__RequestVerificationToken': this.tokens.body
            }), {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
                    'x-content-security-poiicy': 'default-src "self";',
                    'content-type': 'application/x-www-form-urlencoded',
                    ...this.tokens.headers
                }
            , responseType: 'json'})).data.Ref
        } catch(e) { }

        if(!token) {
            if(cont) {
                await this.getTokens();
                return await this.getDepartures(station, false);
            }
            throw Error("Cannot get SKM search token");
        }

        let departures = [];
        let init = await ax.get(`https://portalpasazera.pl/WynikiWyszukiwania/ZnajdzPociag?sid=${token}`);
        let pages = +$('.pagination > li:nth-last-child(2) > a', init.data).text();
        if(isNaN(pages))
            return { ...station, departures: [] };

        for(let i = 1; i <= pages; i++)
            departures.push(ax.get(`https://portalpasazera.pl/WynikiWyszukiwania/ZnajdzPociag?sid=${token}&p=${i}`).then(resp => $('.catalog-table__row', resp.data).toArray().filter(e => $('> div:nth-child(6) > strong', e).text().includes('Miejska w T')).map(e => ({
                destination: $('> div:nth-child(11) > strong > span:nth-child(3)', e).text(),
                vehicle: $('> div:nth-child(9) > strong', e).text(),
                estimate: (() => {
                    let date = new Date();
                    let [hours, minutes, delay] = /(\d+):(\d+)(?:.*\((.*?) )?/s.exec($('> div:nth-child(2) > h3', e).text())?.slice(1)!.map(s => +s)!;
                    if(delay)
                        minutes += delay;
                    if(date.getHours() > hours)
                        date = new Date(Date.now() + 3600 * 23 * 1000);
                    date.setHours(hours);
                    date.setMinutes(minutes);
                    date.setSeconds(0);
                    return date;
                })()
            } as Departure))));
        
        departures = (await Promise.all(departures)).flat();
       
        return { ...station, departures };
    }

    departuresToEmbed(data: StationDepartures): SafeEmbed {
        return new SafeEmbed().setColor(0xfcff00).setAuthor({ name: this.name, icon_url: 'http://www.skm.pkp.pl/favicon-96x96.png' })
        .setDescription('\u200b').setTitle(`Odjazdy ze stacji ${data.stopName}`)
        .addFields(!data.departures.length ? [{ name: '\u200b', value: "brak odjazdów" }]
        : data.departures.slice(0, 25).map(d => ({ name: `**${d.destination}**`, value: `**${+d.estimate - Date.now() > 60_000 ? `za ${Math.round((+d.estimate - Date.now()) / 60_000)} min. **[${(d.estimate as Date).toLocaleTimeString(['pl-PL'], { timeZone: 'Europe/Warsaw' }).slice(0, -3)}]` : '>>>>**'}` })));
    }
}