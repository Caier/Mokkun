import { Collection, Guild } from 'discord.js';
import { MusicQueue } from './MusicQueue';
import { Mokkun } from '../../mokkun';
import { IExtGuild } from '../interfaces/DiscordExtended';

export class MokkunMusic {
    private queues = new Collection<string, MusicQueue>();
    readonly bot: Mokkun;

    constructor(bot: Mokkun) {
        this.bot = bot;
    }

    getQueue(guild: IExtGuild) {
        let q = this.queues.get(guild.id);
        if(!q) {
            q = new MusicQueue(this, guild);
            this.queues.set(guild.id, q);
        }
        return q;
    }

    deleteQueue = (id: string) => this.queues.delete(id);

    destroyQueue(guild: IExtGuild) {
        this.getQueue(guild).destroy();
        return this.queues.delete(guild.id);
    } 
}