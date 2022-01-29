import { BaseClient, Collection } from "discord.js";
import isOnline from "is-online";
import { Mokkun } from "../../mokkun";

export default class Task extends BaseClient {
    static tasks = new Collection<number, Task>();
    id: number;
    bot = Mokkun.getInstance();

    constructor(
        public execInterval: number,
        private exec: (self: Task) => void,
        private onlyOnline = true
    ) {
        super();
        this.id = (Task.tasks.lastKey() ?? 0) + 1;
        Task.tasks.set(this.id, this);
        setInterval(() => this.preExec(), this.execInterval);
    }

    private async preExec() {
        if(!this.bot.readyAt || (this.onlyOnline && !await isOnline({timeout: 1000})))
            return;
        this.exec(this);
    }

    destroy() {
        super.destroy();
        Task.tasks.delete(this.id);
    }
}