import { StreamDispatcher } from "discord.js";
import { VideoEntry } from "@caier/yts/lib/interfaces";
import { TrackEntry } from "@caier/sc/lib/interfaces";
import uuid from 'uuid/v4';
import { IMusicHistory } from "../interfaces/IMusicHistory";

export class MusicEntry {
    id: string = uuid();
    addedOn: number = Date.now();
    addedBy: string;
    type: "yt"|"sc";
    videoInfo: VideoEntry | TrackEntry;
    dispatcher?: StreamDispatcher;

    constructor(opts: {vid: VideoEntry | TrackEntry, by: string, type: "yt"|"sc", queue?: any}) {
        this.addedBy = opts.by;
        this.type = opts.type;
        this.videoInfo = opts.vid;
        if(this.type == 'sc')
            (this.videoInfo as TrackEntry).full_response = undefined;
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

    toJSON() {
        return {
            type: this.type,
            videoInfo: this.videoInfo,
            addedBy: this.addedBy
        } as IMusicHistory;
    }

    static fromJSON(json: IMusicHistory, by?: string) {
        return new MusicEntry({
            vid: json.videoInfo,
            by: by || json.addedBy,
            type: json.type
        });
    }
}