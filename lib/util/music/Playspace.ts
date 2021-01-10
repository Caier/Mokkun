import { Snowflake } from "discord.js";
import { IMusicHistory } from "../interfaces/IMusicHistory";
import { MusicEntry } from "./MusicEntry";

export default class Playspace {
    readonly isDefault: boolean
    maxHistory = 200 
    queue: MusicEntry[] = []
    history: IMusicHistory[] = []
    playing: MusicEntry | null = null
    name: string
    description?: string
    author: Snowflake
    moderators: Snowflake[]
    isPublic = true

    constructor(args: {name: string, description?: string, author: Snowflake, isDefault?: boolean, moderators?: Snowflake[], isPublic?: boolean}) {
        if(!args.moderators)
            args.moderators = [args.author];
        else if(!args.moderators.includes(args.author))
            args.moderators.push(args.author);

        Object.assign(this, args);
    }

    static fromJSON(data: string | any) {
        if(typeof data == 'string')
            data = JSON.parse(data);

        let { name, description, author, isDefault, moderators, isPublic } = data;
        let p = new Playspace({name, description, author, isDefault, moderators, isPublic});
        p.queue = data.queue.map((e: IMusicHistory) => MusicEntry.fromJSON(e));
        p.history = data.history;
        return p;
    }

    toJSON() {
        let obj: any = Object.assign({}, this);
        obj.queue = this.queue.map(e => e.toJSON());
        obj.history = this.history.slice(-this.maxHistory);
        obj.playing = undefined;
        return obj;
    }
}