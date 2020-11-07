import ax from 'axios';
import fs from 'fs';
import { ShortResponse, SIPDelay, SIPResponse } from '../interfaces/ztm';
import Utils from '../utils';
const milis = Utils.parseTimeStrToMilis;
const stopFile = require('./files').default.stopF;
const stopsUrl = 'https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/4c4025f0-01bf-41f7-a39f-d156d201b82b/download/stops.json';
const SIPUrl = (id: number|string) => 'http://ckan2.multimediagdansk.pl/delays?stopId=' + id;

async function updateStops() {
    let resp = (await ax.get(stopsUrl, {responseType: 'json'})).data;
    ///@ts-ignore
    resp = Object.values(resp)[0].stops.filter(stop => stop.stopName);
    fs.writeFileSync(stopFile, JSON.stringify(resp));
}

async function getStops() {
    if(!fs.existsSync(stopFile) || Date.now() - new Date(fs.statSync(stopFile).mtime).getTime() > milis('24h')) 
        await updateStops();
    return JSON.parse(fs.readFileSync(stopFile).toString());
}

export async function getSIP(IDprzystanku: number|string): Promise<SIPResponse> {
    let resp = (await ax.get(SIPUrl(IDprzystanku), {responseType: 'json'})).data;
    if(!resp || !('delay' in resp))
        throw Error('Nie znaleziono danych odjazdów');
    
    let stopName, stopNumer;
    for(let s of await getStops()) {
        if(s.stopId == IDprzystanku) {
            stopName = s.stopDesc;
            stopNumer = s.stopCode;
            break;
        }
    }

    return {
        stopName: stopName,
        stopNumer: stopNumer,
        numerTras: IDprzystanku,
        estimates: resp.delay.map((d: any) => <SIPDelay> {
            routeId: d.routeId,
            headsign: d.headsign,
            estTime: d.estimatedTime,
            vehId: d.vehicleCode,
            delay: d.delayInSeconds,
            relativeTime: (Utils.HMStoMilis(d.estimatedTime, 60) - Utils.HMStoMilis(new Date().toLocaleTimeString([], {timeZone: 'Europe/Warsaw'}).slice(0, -3), 60)) / 60000
        })
    };
}

export async function getShort(query: string): Promise<ShortResponse[]> {
    query = query.toLowerCase();
    if(!/[A-ząćęłńóśżź0-9 ]{3,}/.test(query))
        throw Error('Wyszukanie niezgodne z kryterium');
    
    let code: string;
    if(/[0-9]/.test(query.slice(-1))) {
        let t = /[0-9]/.test(query[query.length - 2]);
        code = query.slice(-1 - +t);
        code.length == 1 && (code = '0' + code);
        query = query.slice(0, -1 - +t);
    }
    query = query.split(' ').map(w => w.trim()).filter(Boolean).join(' ');
    
    const build = (s: any) => <ShortResponse> {
        stopId: s.stopId,
        stopCode: s.stopCode,
        stopDesc: s.stopDesc,
        delay: async () => await getSIP(s.stopId)
    };
   
    let startsWithRes: ShortResponse[] = [], includesRes: ShortResponse[] = [], splitRes: ShortResponse[] = [];
    for(let s of await getStops()) {
        if(s.stopDesc.toLowerCase().startsWith(query))
            startsWithRes.push(build(s));
        else if(s.stopDesc.toLowerCase().includes(query))
            includesRes.push(build(s));
        else if(query.split(' ').length > 1) {
            let Qwords: string[] = query.split(' ');
            let Swords: string[] = s.stopDesc.toLowerCase().trim().split(' ');
            if(Qwords.length != Swords.length)
                continue;
            if(Qwords.every((w, i) => Swords[i].startsWith(w)))
                splitRes.push(build(s));
        }
    }
    const sorter = (a: any, b: any) => `${a.stopDesc} ${a.stopCode}`.localeCompare(`${b.stopDesc} ${b.stopCode}`);
    let resp = [...startsWithRes.sort(sorter), ...includesRes.sort(sorter), ...splitRes.sort(sorter)];
    
    return code ? resp.filter(r => r.stopCode == code) : resp;
}