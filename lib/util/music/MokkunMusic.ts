import { Collection, Guild } from 'discord.js';
import ytdl from 'ytdl-core-discord';
import { MusicQueue } from './MusicQueue';

export class MokkunMusic {
    private queues = new Collection<string, MusicQueue>();

    getQueue(guild: Guild) {
        let q = this.queues.get(guild.id);
        if(!q) {
            q = new MusicQueue();
            this.queues.set(guild.id, q);
        }
        return q;
    }

    static getYTStream(url: string) {
        return ytdl(url, {quality: 'highestaudio', highWaterMark: 1<<25});
    }

    destroyQueue(guild: Guild) {
        this.getQueue(guild).destroy();
        return this.queues.delete(guild.id);
    } 
}