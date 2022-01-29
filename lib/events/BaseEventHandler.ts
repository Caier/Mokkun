import { ClientEvents } from "discord.js";
import { Mokkun } from "../mokkun";

export function Event<K extends keyof ClientEvents>(name: K) {
    return function(target: any) {
        return new Proxy(target, {
            construct(target, args) {
                let inst = new target(...args);
                if(inst.onevent)
                    inst.bot.on(name, (...args: any[]) => inst.onevent(...args));
                if(inst.onceevent)
                    inst.bot.once(name, (...args: any[]) => inst.onceevent(...args));
                return inst;
            }
        });
    }
}

export default class BaseEventHandler {
    onevent?(..._: any[]): void;
    onceevent?(..._: any[]): void;

    constructor(
        protected readonly bot: Mokkun
    ) {}
}