import { GuildMember, StreamDispatcher } from "discord.js";
import { MusicQueue } from "./MusicQueue";
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { TrackEntry } from "@caier/sc/lib/interfaces";
import uuid from 'uuid/v4';

export class MusicEntry {
    id: string = uuid();
    addedOn: number = Date.now();
    addedBy: GuildMember;
    queue: MusicQueue;
    type: "yt"|"sc";
    videoInfo: VideoEntry | TrackEntry;
    dispatcher?: StreamDispatcher;

    constructor(opts: {vid: VideoEntry | TrackEntry, member: GuildMember, queue: MusicQueue, type: "yt"|"sc"}) {
        this.addedBy = opts.member;
        this.queue = opts.queue;
        this.type = opts.type;
        this.videoInfo = opts.vid;
    }
    
    get strTime() {
        return this.dispatcher?.streamTime ?? 0;
    }

    get milisLeft() {
        return this.videoInfo.milis - this.strTime;
    }

    get timeLeft() {
        return new Date(this.milisLeft).toISOString().slice(11, -5).replace(/^0+:?0?/g, '');
    }
}