import { APIEmbed, JSONEncodable } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export interface Departure {
    line?: string
    destination: string
    estimate: Date | string
    planned?: Date | string
    vehicle: string
}

export interface Station {
    stopName: string
    stopCode?: string
    stopId: string
}

export interface StationDepartures extends Station {
    departures: Departure[]
}

export default abstract class ProviderResolver {
    static providers = new Map<string, ProviderResolver>();
    public stops: Station[] = [];

    constructor(protected readonly name: string) {
        if(ProviderResolver.providers.has(name))
            throw Error('This Provider already exists');
        ProviderResolver.providers.set(name, this);
    }

    abstract queryStations(query: string): Promise<Station[]>;

    abstract getDepartures(station: Station): Promise<StationDepartures>;

    abstract departuresToEmbed(data: StationDepartures): JSONEncodable<APIEmbed>;

    static async loadResolvers() {
        for(const file of fs.readdirSync(path.dirname(fileURLToPath(import.meta.url))).filter(p => p.endsWith('pr.js')))
            new (await import(pathToFileURL(path.resolve(fileURLToPath(import.meta.url), '..', file)).toString())).default();
    }
}