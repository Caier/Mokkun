import { VideoEntry } from "@caier/yts/lib/interfaces";
import { v4 as uuid } from 'uuid';
import { IMusicHistory } from "../interfaces/IMusicHistory.js";
import { AudioPlayer, AudioResource } from "@discordjs/voice";

export class MusicEntry {
    id: string = uuid();
    addedOn: number = Date.now();
    addedBy: string;
    type: "yt"|"sc";
    videoInfo: VideoEntry;
    audioRes?: AudioResource;

    constructor(opts: {vid: VideoEntry, by: string, type: "yt"|"sc", queue?: any}) {
        this.addedBy = opts.by;
        this.type = opts.type;
        this.videoInfo = opts.vid;
    }
    
    get strTime() {
        return this.audioRes?.playbackDuration ?? 0;
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