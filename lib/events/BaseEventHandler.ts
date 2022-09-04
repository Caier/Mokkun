import { ClientEvents } from "discord.js";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Mokkun } from "../mokkun.js";
import Util from '../util/utils.js'

export default abstract class BaseEventHandler {
    onevent?<K extends ReturnType<this['event']>>(..._: ClientEvents[K]): void | Promise<void>;
    onceevent?<K extends ReturnType<this['event']>>(..._: ClientEvents[K]): void | Promise<void>;

    abstract event(): keyof ClientEvents;
    
    constructor(
        protected readonly bot: Mokkun
    ) {
        if(this.onevent)
            this.bot.on(this.event(), (...args) => this.onevent!(...args as any));
        if(this.onceevent)
            this.bot.once(this.event(), (...args) => this.onceevent!(...args as any));
    }

    static async loadEvents(bot: Mokkun) {
        for(let evF of Util.dirWalk(path.resolve(fileURLToPath(import.meta.url), '..', 'handlers')).filter(f => f.endsWith('.e.js'))) {
            let handler = (await import(pathToFileURL(path.join(fileURLToPath(import.meta.url), '..', 'handlers', evF)).toString())).default;
            new handler(bot);
        }
    }
}