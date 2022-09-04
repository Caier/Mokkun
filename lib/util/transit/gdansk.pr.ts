import ProviderResolver, { Station, StationDepartures } from "./ProviderResolver.js";
import fs from 'fs';
import files from "../misc/files.js";
import Utils from "../utils.js";
import Task from "../tasks/Task.js";
import ax from 'axios';
import SafeEmbed from "../embed/SafeEmbed.js";

export default class extends ProviderResolver {
    constructor() {
        super('ZTM Gdańsk');

        new Task(3_600_000 + Utils.rand(800_000, 1_800_000), this.name + ' stops manager', async () => {
            if(fs.existsSync(files.stops(this.name)) && Date.now() - fs.statSync(files.stops(this.name)).mtimeMs < Utils.parseTimeStrToMilis('1d'))
                this.stops = JSON.parse(fs.readFileSync(files.stops(this.name)).toString());
            else
                await this.fetchStops();
        });
    }

    private async fetchStops() {
        let resp = await ax.get('https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/4c4025f0-01bf-41f7-a39f-d156d201b82b/download/stops.json', { responseType: 'json' });
        let stops: Station[] = ((Object.values(resp.data)[0] as any).stops as any[]).filter(s => !!s.stopName).map(s => ({ stopName: s.stopDesc, stopCode: s.stopCode, stopId: s.stopId }));
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
        let resp = await ax.get('https://ckan2.multimediagdansk.pl/departures?stopId=' + encodeURI(station.stopId), { responseType: 'json' });
        if(!resp.data)
            throw Error('Invalid station ID');
        return {
            ...this.stops.find(s => s.stopId == station.stopId)!,
            departures: resp.data.departures.map((d: any) => ({
                line: ''+d.routeId,
                destination: d.headsign,
                vehicle: d.vehicleCode,
                estimate: new Date(d.estimatedTime)
            }))
        };
    }

    departuresToEmbed(data: StationDepartures): SafeEmbed {
        return new SafeEmbed().setColor(13632027)
        .setTitle(`Odjazdy z przystanku ${data.stopName} ${data.stopCode}`)
        .setDescription('\u200b').setAuthor({ name: this.name, icon_url: 'https://i.imgur.com/LugSpz8.png' })
        .addFields(!data.departures.length ? [{name: '\u200b', value: "brak odjazdów w najbliższym czasie"}]
        : data.departures.map(i => ({name: `**${(['4', '8'].includes(i.line![0]) && i.line!.length >= 2) ? ((i.line![0] === '4') ? 'N' : 'T') + i.line!.slice((i.line![1] === '0') ? 2 : 1) : i.line} ${i.destination}** ${i.vehicle ? `[${i.vehicle}]` : ''}`, value: `**${+i.estimate - Date.now() > 60_000 ? `za ${Math.round((+i.estimate - Date.now()) / 60_000)} min. **[${(i.estimate as Date).toLocaleTimeString(['pl-PL'], { timeZone: 'Europe/Warsaw' }).slice(0, -3)}]` : '>>>>**'}`})));
    }
}