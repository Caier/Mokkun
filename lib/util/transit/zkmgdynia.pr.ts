import ProviderResolver, { Station, StationDepartures } from "./ProviderResolver.js";
import fs from 'fs';
import files from "../misc/files.js";
import Utils from "../utils.js";
import Task from "../tasks/Task.js";
import ax from 'axios';
import SafeEmbed from "../embed/SafeEmbed.js";

export default class extends ProviderResolver {
    constructor() {
        super('ZKM Gdynia');

        new Task(3_600_000 + Utils.rand(800_000, 1_800_000), this.name + ' stops manager', async () => {
            if(fs.existsSync(files.stops(this.name)) && Date.now() - fs.statSync(files.stops(this.name)).mtimeMs < Utils.parseTimeStrToMilis('1d'))
                this.stops = JSON.parse(fs.readFileSync(files.stops(this.name)).toString());
            else
                await this.fetchStops();
        });
    }

    private async fetchStops() {
        let resp = await ax.get('http://api.zdiz.gdynia.pl/pt/stops', { responseType: 'json' });
        let stops: Station[] = resp.data.map((s: any) => ({ stopName: s.stopName.slice(0, -2), stopCode: s.stopName.slice(-2), stopId: s.stopId }));
        this.stops = stops;
        fs.writeFileSync(files.stops(this.name), JSON.stringify(this.stops, null, 2));
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
                let code;
                if(!isNaN(+Qwords[Qwords.length - 1]))
                    code = +Qwords.pop()!;
                let Swords = s.stopName.toLowerCase().trim().split(' ');
                if(Qwords.length != Swords.length || code && !s.stopCode!.endsWith(''+code))
                    continue;
                if(Qwords.every((w, i) => Swords[i].startsWith(w)))
                    splitRes.push(s);
            }
        }
        const sorter = (a: Station, b: Station) => `${a.stopName} ${a.stopCode}`.localeCompare(`${b.stopName} ${b.stopCode}`);
        return [...startsWithRes.sort(sorter), ...includesRes.sort(sorter), ...splitRes.sort(sorter)];
    }

    async getDepartures(station: Station): Promise<StationDepartures> {
        let resp = await ax.get('https://zkmgdynia.pl/stopsAPI/getDisplay/' + encodeURI(station.stopId), { responseType: 'json' });
        if(!resp.data?.delay)
            throw Error('Invalid station ID');
        return {
            ...this.stops.find(s => s.stopId == station.stopId)!,
            departures: resp.data.delay.map((d: any) => ({
                line: d.shortName,
                destination: isNaN(+d.headSign.slice(-1)) ? d.headSign : d.headSign.slice(0, -3),
                estimate: (() => {
                    let date = new Date();
                    if(date.getHours() > +d.delayDesc.slice(0, 2))
                        date = new Date(Date.now() + 3600 * 23 * 1000);
                    date.setHours(+d.delayDesc.slice(0, 2));
                    date.setMinutes(+d.delayDesc.slice(3));
                    date.setSeconds(0);
                    return date;
                })()
            }))
        };
    }

    departuresToEmbed(data: StationDepartures): SafeEmbed {
        return new SafeEmbed().setColor(0x3a84df)
        .setTitle(`Odjazdy z przystanku ${data.stopName} ${data.stopCode}`)
        .setDescription('\u200b').setAuthor({ name: this.name, icon_url: 'https://zkmgdynia.pl/assets/images/favicon/android-icon-192x192.png' })
        .addFields(!data.departures.length ? [{name: '\u200b', value: "brak odjazdów w najbliższym czasie"}]
        : data.departures.map(i => ({name: `**${i.line} ${i.destination}**`, value: `**${+i.estimate - Date.now() > 60_000 ? `za ${Math.round((+i.estimate - Date.now()) / 60_000)} min. **[${(i.estimate as Date).toLocaleTimeString(['pl-PL'], { timeZone: 'Europe/Warsaw' }).slice(0, -3)}]` : '>>>>**'}`})));
    }
}