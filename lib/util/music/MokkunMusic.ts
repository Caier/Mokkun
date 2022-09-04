import { Collection, Guild } from 'discord.js';
import { Mokkun } from '../../mokkun.js';

export class MokkunMusic {
    // private queues = new Collection<string, MusicQueue>();
    // readonly bot: Mokkun;

    // constructor(bot: Mokkun) {
    //     this.bot = bot;
    // }

    // getQueue(guild: Guild) {
    //     let q = this.queues.get(guild.id);
    //     if(!q) {
    //         q = new MusicQueue(this, guild.id);
    //         this.queues.set(guild.id, q);
    //     }
    //     return q;
    // }

    // deleteQueue = (id: string) => this.queues.delete(id);

    // destroyQueue(guild: Guild) {
    //     this.getQueue(guild).destroy();
    //     return this.queues.delete(guild.id);
    // } 
}