import { MessageEmbed } from 'discord.js';
import fs from 'fs';
import path from 'path';

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

export default class ProviderResolver {
    static providers = new Map<string, ProviderResolver>();
    public stops: Station[];

    constructor(protected readonly name: string) {
        if(ProviderResolver.providers.has(name))
            throw Error('This Provider already exists');
        ProviderResolver.providers.set(name, this);
    }

    async queryStations(query: string): Promise<Station[]> {
        throw new Error('Not implemented');
    }

    async getDepartures(station: Station): Promise<StationDepartures> {
        throw new Error('Not implemented');
    }

    departuresToEmbed(data: StationDepartures): MessageEmbed {
        throw new Error('Not implemented');
    }
}

fs.readdirSync(__dirname).filter(p => p.endsWith('pr.js')).forEach(p => new (require(path.join(__dirname, p))).default());