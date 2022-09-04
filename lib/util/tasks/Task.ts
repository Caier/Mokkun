import { BaseClient, Collection, TextBasedChannel } from "discord.js";
import isOnline from "is-online";
import { Mokkun } from "../../mokkun.js";
import Utils from "../utils.js";

export default class Task {
    static tasks = new Collection<number, Task>();
    id: number;
    bot!: Mokkun;
    ownData: any;

    constructor(
        public execInterval: number,
        public name: string,
        private exec: (self: Task) => void | Promise<void>,
        private onlyOnline = true
    ) {
        this.id = (Task.tasks.lastKey() ?? 0) + 1;
        Task.tasks.set(this.id, this);
        setTimeout(() => this.preExec(), 5000);
    }

    private async preExec() {  
        while(!this.bot?.readyAt || (this.onlyOnline && !await isOnline({timeout: 1000})))
            await new Promise(r => setTimeout(r, 500));
        try {
            await this.exec(this);
        } catch(err) {
            if(process.env.DEBUG_CHANNEL)
                //Utils.send(await this.bot.channels.fetch(process.env.DEBUG_CHANNEL) as TextBasedChannel, `Error while executing task ${this.name}:\n${err}`, { split: true, code: 'js' }).catch(()=>{});
            console.error(`Error while executing task ${this.name}:\n${err}`);
        }
        setTimeout(() => this.preExec(), this.execInterval);
    }

    destroy() {
        Task.tasks.delete(this.id);
    }

    static attach(bot: Mokkun) {
        for(let t of Task.tasks.values())
            t.bot = bot;
    }
}